const fs = require("fs");
const path = require("path");

/**
 * PID 文件管理工具
 *
 * 每个进程启动时写入自己的 PID + 元信息 → .logs/.pids/<name>.pid
 *
 * 目的：
 * - 作为安全锚点：停止时优先通过 PID 文件精准 kill，不依赖命令行猜测
 * - 僵尸进程识别：PID 文件对应的进程不存在 → 上次异常退出，端口可安全回收
 * - 跨平台兼容：纯 Node.js 实现，不依赖 PowerShell/WMI
 *
 * 防误杀设计：
 * 1. PID 文件是"允许 kill"的白名单，只有写入过 PID 的进程能被清理
 * 2. 清理时验证：PID 仍在运行 + 命令行包含项目根路径 + 进程存活时间 > 5s
 *    三重校验全通过才 kill
 * 3. 端口仅在 PID 文件记录的范围内清理，不会越界
 */

const PIDS_DIR = path.resolve(process.cwd(), "..", "..", ".logs", ".pids");

function getRepoRoot() {
  return path.resolve(process.cwd(), "..", "..");
}

function writePidFile(name, pid, extras = {}) {
  const dir = PIDS_DIR;
  fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${name}.pid`);
  const data = {
    name,
    pid,
    repoRoot: getRepoRoot(),
    createdAt: new Date().toISOString(),
    ...extras,
  };

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
  return filePath;
}

function removePidFile(name) {
  const filePath = path.join(PIDS_DIR, `${name}.pid`);
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function readPidFile(name) {
  const filePath = path.join(PIDS_DIR, `${name}.pid`);
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function listPidFiles() {
  const dir = PIDS_DIR;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".pid"))
      .map((e) => {
        const data = readPidFile(e.name.replace(".pid", ""));
        return data ? { ...data, _pidFilePath: path.join(dir, e.name) } : null;
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * 检查 PID 是否仍在运行（Windows）
 */
function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

// CLI: node scripts/write-pid.cjs <name> [--port <port>]
if (require.main === module) {
  const name = process.argv[2];
  if (!name) {
    console.error("Usage: node scripts/write-pid.cjs <name> [--port <port>]");
    process.exit(1);
  }

  const portIndex = process.argv.indexOf("--port");
  const port = portIndex >= 0 ? Number(process.argv[portIndex + 1]) || undefined : undefined;

  const filePath = writePidFile(name, process.pid, { port });
  console.log(`[pid] ${name} (PID=${process.pid}${port ? `, PORT=${port}` : ""}) → ${filePath}`);

  // Clean up PID file on normal exit
  const cleanup = () => {
    removePidFile(name);
    console.log(`[pid] removed ${name}.pid`);
  };
  process.on("exit", cleanup);
  process.on("SIGINT", () => { cleanup(); process.exit(0); });
  process.on("SIGTERM", () => { cleanup(); process.exit(0); });
}

module.exports = {
  writePidFile,
  removePidFile,
  readPidFile,
  listPidFiles,
  isPidAlive,
  PIDS_DIR,
};
