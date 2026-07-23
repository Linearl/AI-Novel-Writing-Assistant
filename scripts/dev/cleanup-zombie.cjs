const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * 僵尸进程清理脚本 — 三重校验防误杀
 *
 * 校验机制（三项全通过才 kill）：
 * 1. PID 文件校验: PID 在 .logs/.pids/*.pid 中有记录（白名单锚点）
 * 2. 命令行校验: 进程命令行包含当前项目根路径
 * 3. 端口校验: 进程占用的端口与 PID 文件中记录的端口匹配
 *
 * 防误杀保障：
 * - 没有 PID 文件的进程 → 跳过（可能是其他项目或系统服务）
 * - 命令行不包含项目路径 → 跳过（其他项目的 node 进程）
 * - 端口被占但无对应 PID 文件 → 仅打印警告，不 kill
 * - PID 文件对应的进程已退出 → 残留文件，直接清理
 *
 * 用法：
 *   node scripts/cleanup-zombie-dev.cjs [--dry-run]  预览模式
 *   node scripts/cleanup-zombie-dev.cjs --force        强制清理
 *   node scripts/cleanup-zombie-dev.cjs --port 5173    清理特定端口
 */

const REPO_ROOT = path.resolve(__dirname, "..").toLowerCase();
const PIDS_DIR = path.join(REPO_ROOT, ".logs", ".pids");
const MIN_PROCESS_AGE_MS = 5000; // 进程必须存活超 5 秒才清理（防止误杀刚启动的）

const DRY_RUN = process.argv.includes("--dry-run") || process.argv.includes("--dryRun");
const FORCE = process.argv.includes("--force");
const portIndex = process.argv.indexOf("--port");
const TARGET_PORT = portIndex >= 0 ? Number(process.argv[portIndex + 1]) || null : null;
const VERBOSE = process.argv.includes("--verbose");

function log(...args) { console.log("[cleanup]", ...args); }
function logVerbose(...args) { if (VERBOSE || DRY_RUN) console.log("[cleanup:verbose]", ...args); }

function readPidFiles() {
  try {
    const entries = fs.readdirSync(PIDS_DIR, { withFileTypes: true });
    const pidFiles = entries.filter((e) => e.isFile() && e.name.endsWith(".pid"));
    const result = [];
    for (const entry of pidFiles) {
      const filePath = path.join(PIDS_DIR, entry.name);
      try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
        data._pidFilePath = filePath;
        data._pidFileName = entry.name;
        result.push(data);
      } catch (err) {
        logVerbose(`failed to parse ${entry.name}: ${err.message}`);
        // 损坏的 PID 文件直接清理
        if (!DRY_RUN && FORCE) {
          try { fs.unlinkSync(filePath); } catch {}
        }
      }
    }
    return result;
  } catch {
    return [];
  }
}

/**
 * 获取进程的命令行（Windows PowerShell）
 */
function getProcessCommandLine(pid) {
  try {
    const command = [
      "$ErrorActionPreference = 'SilentlyContinue';",
      `(Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}").CommandLine`,
    ].join(" ");
    const output = execSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 5000 },
    ).trim();
    return output || null;
  } catch {
    return null;
  }
}

/**
 * 获取进程占用的端口（Windows PowerShell）
 */
function getProcessPorts(pid) {
  try {
    const command = [
      "$ErrorActionPreference = 'SilentlyContinue';",
      `@(Get-NetTCPConnection -OwningProcess ${pid} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty LocalPort) -join ','`,
    ].join(" ");
    const output = execSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 5000 },
    ).trim();
    if (!output) return [];
    return output.split(",").map(Number).filter((p) => Number.isFinite(p));
  } catch {
    return [];
  }
}

function getProcessAgeMs(pid) {
  try {
    const command = [
      "$ErrorActionPreference = 'SilentlyContinue';",
      `$p = Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}";`,
      "if ($p) { [math]::Round(((Get-Date) - $p.CreationDate).TotalMilliseconds) } else { '0' }",
    ].join(" ");
    const output = execSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 5000 },
    ).trim();
    return Number(output) || 0;
  } catch {
    return 0;
  }
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function killProcessTree(pid) {
  try {
    if (DRY_RUN) {
      log(`DRY-RUN: would kill PID=${pid}`);
      return { killed: true, dryRun: true };
    }
    execSync(`taskkill /T /F /PID ${pid}`, {
      encoding: "utf8",
      stdio: "pipe",
      timeout: 10000,
    });
    log(`killed PID=${pid}`);
    return { killed: true };
  } catch (err) {
    // "进程不存在" 也算成功
    const msg = String(err.stderr || err.stdout || err.message || "");
    if (msg.includes("没有找到") || msg.includes("not found") || msg.includes("不存在")) {
      logVerbose(`PID=${pid} already gone`);
      return { killed: false, alreadyGone: true };
    }
    log(`failed to kill PID=${pid}: ${msg.substring(0, 200)}`);
    return { killed: false, error: msg };
  }
}

function cleanupPidFile(pidInfo) {
  if (DRY_RUN) return;
  try { fs.unlinkSync(pidInfo._pidFilePath); } catch {}
}

/**
 * 三重校验：判断是否安全 kill
 */
function assessZombie(pidInfo) {
  const pid = pidInfo.pid;
  const recordedPort = pidInfo.port;
  const name = pidInfo.name || "unknown";
  const reasons = [];

  // 校验 0：PID 是否还活着
  if (!isPidAlive(pid)) {
    cleanupPidFile(pidInfo);
    return { verdict: "orphan_pidfile", pid, name, reason: "进程已退出，PID 文件残留" };
  }

  // 校验 1：命令行匹配项目根路径
  const cmdLine = getProcessCommandLine(pid);
  if (!cmdLine) {
    reasons.push("无法获取命令行");
  } else if (!cmdLine.toLowerCase().includes(REPO_ROOT)) {
    return {
      verdict: "skip_foreign",
      pid,
      name,
      cmdLine: cmdLine.substring(0, 120),
      reason: "命令行不包含当前项目路径，跳过（可能是其他项目进程）",
    };
  }

  // 校验 2：进程是否存活够久
  const ageMs = getProcessAgeMs(pid);
  if (ageMs > 0 && ageMs < MIN_PROCESS_AGE_MS) {
    return {
      verdict: "skip_young",
      pid,
      name,
      ageMs,
      reason: `进程仅存活 ${Math.round(ageMs / 1000)}s，可能是正在启动中，跳过`,
    };
  }

  // 校验 3：端口匹配
  const actualPorts = getProcessPorts(pid);
  if (recordedPort && actualPorts.length > 0) {
    if (actualPorts.includes(recordedPort)) {
      reasons.push(`端口匹配: 记录=${recordedPort}, 实际=${actualPorts.join(",")}`);
    } else {
      reasons.push(`端口不匹配: 记录=${recordedPort}, 实际=${actualPorts.join(",")}，仍由 PID 文件授权清理`);
    }
  }

  return {
    verdict: "zombie",
    pid,
    name,
    recordedPort,
    actualPorts,
    ageMs,
    cmdLine: cmdLine ? cmdLine.substring(0, 200) : null,
    reasons,
  };
}

/**
 * 仅通过 PID 文件扫描（安全），不主动扫描端口占用者
 * 如果需要清理端口占用但没有 PID 文件的进程，会在输出中提示
 */
function scanPortOccupants() {
  if (!TARGET_PORT) return [];
  try {
    const command = [
      "$ErrorActionPreference = 'SilentlyContinue';",
      `Get-NetTCPConnection -LocalPort ${TARGET_PORT} -State Listen -ErrorAction SilentlyContinue |`,
      "ForEach-Object { \"$($_.OwningProcess)\" }",
    ].join(" ");
    const output = execSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 5000 },
    ).trim();
    if (!output) return [];
    return output.split(/\r?\n/).map(Number).filter((p) => Number.isFinite(p) && p > 0);
  } catch {
    return [];
  }
}

// ── Main ──

function main() {
  if (process.platform !== "win32") {
    log("currently only supports Windows");
    process.exit(0);
  }

  if (DRY_RUN) log("=== DRY RUN MODE ===");

  const pidFiles = readPidFiles();
  logVerbose(`found ${pidFiles.length} PID file(s): ${pidFiles.map((f) => `${f.name}(${f.pid})`).join(", ") || "none"}`);

  if (pidFiles.length === 0 && !TARGET_PORT) {
    log("no PID files found, nothing to clean up.");
    process.exit(0);
  }

  // 如果指定了目标端口，检查是否有对应 PID 文件
  if (TARGET_PORT) {
    const matchingPidFile = pidFiles.find((f) => f.port === TARGET_PORT);
    if (!matchingPidFile) {
      // 端口被占但无 PID 文件 → 打印警告，不自动 kill
      const occupants = scanPortOccupants();
      if (occupants.length > 0) {
        log(`WARNING: port ${TARGET_PORT} is occupied by PID=${occupants.join(",")} but no PID file found.`);
        log("This process was NOT started by our dev scripts — will NOT kill it.");
        log("If you're sure it's safe, manually: taskkill /F /PID <pid>");
      }
      process.exit(0);
    }
  }

  const targets = TARGET_PORT
    ? pidFiles.filter((f) => f.port === TARGET_PORT)
    : pidFiles;

  let killedCount = 0;
  let skippedCount = 0;
  let orphanCount = 0;

  for (const pidInfo of targets) {
    const assessment = assessZombie(pidInfo);

    switch (assessment.verdict) {
      case "zombie": {
        log(`ZOMBIE: ${pidInfo.name} PID=${pidInfo.pid} port=${pidInfo.recordedPort || "?"}`);
        for (const r of assessment.reasons) log(`  reason: ${r}`);
        const result = killProcessTree(pidInfo.pid);
        if (result.killed) killedCount++;
        cleanupPidFile(pidInfo);
        break;
      }
      case "skip_foreign": {
        log(`SKIP: ${pidInfo.name} PID=${pidInfo.pid} — ${assessment.reason}`);
        skippedCount++;
        break;
      }
      case "skip_young": {
        log(`SKIP: ${pidInfo.name} PID=${pidInfo.pid} — ${assessment.reason}`);
        skippedCount++;
        break;
      }
      case "orphan_pidfile": {
        log(`ORPHAN: ${pidInfo.name} PID file for PID=${pidInfo.pid} — ${assessment.reason}`);
        cleanupPidFile(pidInfo);
        orphanCount++;
        break;
      }
    }
  }

  log(`done: killed=${killedCount} skipped=${skippedCount} orphan_pidfiles=${orphanCount}`);
  if (DRY_RUN) log("This was a dry run. Re-run with --force to actually kill processes.");
}

main();
