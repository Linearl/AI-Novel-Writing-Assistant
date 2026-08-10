#!/usr/bin/env node
/**
 * build-portable-dir.js
 *
 * 一键构建便携式文件夹版本（免安装、数据本地化）。
 *
 * 流程：
 *   1. 调用 build:desktop:all 完整构建链（shared → prisma generate → server → client → desktop tsc）
 *   2. 执行 stage-desktop.cjs 组装构建产物到 desktop/build/
 *   3. 调用 electron-builder --win dir 输出解压目录到 release/
 *   4. 后处理：复制启动脚本、README，生成版本信息
 *
 * 用法（在项目根目录执行）：
 *   node scripts/desktop/build-portable.cjs              # 完整构建 + 打包
 *   node scripts/desktop/build-portable.cjs --reuse-stage # 跳过构建，复用 desktop/build/ 现有产物
 *
 * 产物：
 *   release/ai-novel-desktop-v{version}/
 *     ├── AI Novel Writing Assistant v2.exe   ← 双击启动
 *     ├── resources/
 *     │   ├── app.asar                        ← Electron + server
 *     │   └── client/dist/                    ← 前端资源
 *     ├── data/                               ← 运行时自动创建（数据库/配置/日志，全在此目录）
 *     ├── start.bat                           ← 快捷启动脚本
 *     └── README.txt                          ← 使用说明
 */

const { execSync, execFileSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, "../..");
const DESKTOP_DIR = path.join(ROOT, "desktop");
const RELEASE_DIR = path.join(ROOT, "release");
const DESKTOP_PKG = JSON.parse(
  fs.readFileSync(path.join(DESKTOP_DIR, "package.json"), "utf-8")
);
const VERSION = DESKTOP_PKG.version;
const PRODUCT_NAME = "AI Novel Writing Assistant v2";
const DIR_NAME = `ai-novel-desktop-v${VERSION}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg) {
  const ts = new Date().toLocaleTimeString("zh-CN", { hour12: false });
  console.log(`\x1b[36m[${ts}]\x1b[0m ${msg}`);
}

function run(cmdOrExec, argsOrOpts, opts) {
  if (Array.isArray(argsOrOpts)) {
    log(`exec: ${cmdOrExec} ${argsOrOpts.join(" ")}`);
    // .cmd 命令（pnpm, npm）需要 cmd.exe 解析，但没有中文路径参数所以安全
    // 完整路径命令（如 process.execPath）直接用 execFileSync 避免编码问题
    const needShell = !cmdOrExec.includes(path.sep);
    if (needShell) {
      execSync(`${cmdOrExec} ${argsOrOpts.join(" ")}`, { cwd: ROOT, stdio: "inherit", ...opts });
    } else {
      execFileSync(cmdOrExec, argsOrOpts, { cwd: ROOT, stdio: "inherit", ...opts });
    }
  } else {
    const o = argsOrOpts || {};
    log(`exec: ${cmdOrExec}`);
    execSync(cmdOrExec, { cwd: ROOT, stdio: "inherit", ...o });
  }
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function rimraf(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Step 0: Parse args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const reuseStage = args.includes("--reuse-stage");

// ---------------------------------------------------------------------------
// Step 1: Build（可跳过）
// ---------------------------------------------------------------------------

if (reuseStage) {
  log("⏭️  跳过完整构建（--reuse-stage），复用现有 desktop/build/ 产物");
  if (!fs.existsSync(path.join(DESKTOP_DIR, "build", "app"))) {
    console.error(
      "\x1b[31m❌ desktop/build/app 不存在，请先运行完整构建（去掉 --reuse-stage）\x1b[0m"
    );
    process.exit(1);
  }
} else {
  // 清理旧的 desktop/build 目录（避免残留文件导致 pnpm deploy EPERM）
  const buildPath = path.join(DESKTOP_DIR, "build");
  if (fs.existsSync(buildPath)) {
    log(`🧹 清理旧构建目录：${buildPath}`);
    rimraf(buildPath);
  }

  log("🔨 Step 1/4: 完整构建链（shared → prisma → server → client → desktop）");
  run("pnpm", ["run", "build:desktop:all"]);
}

// ---------------------------------------------------------------------------
// Step 2: Stage
// ---------------------------------------------------------------------------

log("📦 Step 2/4: 组装构建产物到 desktop/build/");
if (reuseStage) {
  log("⏭️  跳过 staging（复用现有产物）");
} else {
  // 清理 staging 残留目录（Windows pnpm deploy rename 失败时会留下 app_tmp_* 或 app.__pnpm_tmp__）
  const buildDir = path.join(DESKTOP_DIR, "build");
  if (fs.existsSync(buildDir)) {
    for (const entry of fs.readdirSync(buildDir)) {
      if (entry === "app" || entry.includes("_tmp_") || entry.includes("__pnpm_tmp__")) {
        const target = path.join(buildDir, entry);
        log(`🧹 清理残留：${target}`);
        fs.rmSync(target, { recursive: true, force: true });
      }
    }
  }
  run(process.execPath, ["desktop/scripts/stage-desktop.cjs"]);
}

// ---------------------------------------------------------------------------
// Step 3: electron-builder --win dir
// ---------------------------------------------------------------------------

log("📁 Step 3/4: 调用 electron-builder 打包文件夹版本");

// 清理旧产物（避免 electron-builder 复用旧的 win-unpacked/ 缓存）
rimraf(path.join(RELEASE_DIR, DIR_NAME));
rimraf(path.join(DESKTOP_DIR, "build", "dist"));
mkdirp(RELEASE_DIR);

// 直接调用 electron-builder CLI（绕过 run-electron-builder.cjs 的 patch 导致的崩溃）
const electronBuilderCli = require.resolve("electron-builder/cli.js", {
  paths: [path.join(ROOT, "desktop"), ROOT],
});
const electronBuilderArgs = [
  "--config", "electron-builder.config.cjs",
  "--dir",
  "--win",
  "--x64",
  "--config.npmRebuild=false",
];
log(`exec: ${electronBuilderCli} ${electronBuilderArgs.join(" ")}`);
execFileSync(process.execPath, [electronBuilderCli, ...electronBuilderArgs], {
  cwd: path.join(ROOT, "desktop"),
  stdio: "inherit",
  env: process.env,
});

// ---------------------------------------------------------------------------
// Step 4: 后处理
// ---------------------------------------------------------------------------

log("📝 Step 4/4: 后处理（启动脚本 + README + 清理）");

// electron-builder dir 产物的默认位置：desktop/build/dist/win-unpacked/
const BUILDER_OUTPUT = path.join(DESKTOP_DIR, "build", "dist", "win-unpacked");

if (!fs.existsSync(BUILDER_OUTPUT)) {
  console.error(
    `\x1b[31m❌ electron-builder 产物目录不存在：${BUILDER_OUTPUT}\x1b[0m`
  );
  process.exit(1);
}

// 复制到 release/{DIR_NAME}/（用 robocopy 避免 Windows fs.cpSync 崩溃）
const targetDir = path.join(RELEASE_DIR, DIR_NAME);

// ── asar 补丁：修复 @langchain/core exports 兼容性 ──────────────────────
{
  const asarPath = path.join(BUILDER_OUTPUT, "resources", "app.asar");
  const asarCli = path.join(ROOT, "node_modules", ".pnpm", "@electron+asar@3.4.1", "node_modules", "@electron", "asar", "bin", "asar.js");
  const patchTarget = "node_modules/@langchain/core/package.json";
  const tmpExtractDir = path.join(BUILDER_OUTPUT, "resources", "_asar_tmp");

  try {
    fs.rmSync(tmpExtractDir, { recursive: true, force: true });
    mkdirp(tmpExtractDir);
    execFileSync(process.execPath, [asarCli, "e", asarPath, tmpExtractDir], { stdio: "pipe" });

    const pkgFile = path.join(tmpExtractDir, patchTarget);
    if (fs.existsSync(pkgFile)) {
      const pkgJson = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
      if (pkgJson.exports && !pkgJson.exports["./utils/*"]) {
        pkgJson.exports["./utils/*"] = {
          types: "./dist/utils/*.d.ts",
          default: "./dist/utils/*.cjs",
        };
        fs.writeFileSync(pkgFile, JSON.stringify(pkgJson, null, 2));
        fs.rmSync(asarPath, { force: true });
        execFileSync(process.execPath, [asarCli, "p", tmpExtractDir, asarPath], { stdio: "pipe" });
        log("🩹 Patched @langchain/core exports in asar");
      } else {
        log("🩹 @langchain/core exports already patched or no exports field");
      }
    }
    fs.rmSync(tmpExtractDir, { recursive: true, force: true });
  } catch (err) {
    log(`⚠️ asar patch failed: ${err.message}`);
    fs.rmSync(tmpExtractDir, { recursive: true, force: true });
  }
}

rimraf(targetDir);
try {
  execFileSync("robocopy", [BUILDER_OUTPUT, targetDir, "/E", "/COPY:DAT", "/R:1", "/W:1", "/NFL", "/NDL", "/NJH", "/NJS"], { stdio: "pipe" });
} catch (err) {
  if (err.status === undefined || err.status >= 16) throw err;
}

// 将 server 生产依赖复制到 resources/node_modules（asar 外部，供运行时 require）
const serverNodeModulesSrc = path.join(DESKTOP_DIR, "build", "app", "node_modules");
const serverNodeModulesDest = path.join(targetDir, "resources", "node_modules");
if (fs.existsSync(serverNodeModulesSrc)) {
  // 先在 staging 目录重建 native 模块（有 package.json，rebuild 能正常工作）
  log("🔨 重建 native 模块（@electron/rebuild）...");
  try {
    execSync(
      `npx @electron/rebuild --version 35.7.5 --arch x64`,
      { cwd: path.join(DESKTOP_DIR, "build", "app"), stdio: "inherit", env: process.env }
    );
  } catch (err) {
    log(`⚠️  native 模块重建失败（非致命）: ${err.message}`);
  }

  // 再复制到 release
  log("📦 复制 server 生产依赖到 resources/node_modules/");
  try {
    execFileSync("robocopy", [serverNodeModulesSrc, serverNodeModulesDest, "/E", "/COPY:DAT", "/R:1", "/W:1", "/NFL", "/NDL", "/NJH", "/NJS"], { stdio: "pipe" });
  } catch (err) {
    if (err.status === undefined || err.status >= 16) throw err;
  }

  // 将重建后的 native 模块（.node 文件）复制回 resources/app/node_modules/
  // electron-builder 打包时移除了 .node 文件，需要从重建后的 resources/node_modules/ 补回
  const appNodeModulesDest = path.join(targetDir, "resources", "app", "node_modules");
  if (fs.existsSync(appNodeModulesDest)) {
    log("📦 补充 native 模块到 resources/app/node_modules/...");
    // 只复制 .node 文件和 prebuilds 目录
    try {
      execFileSync(
        "robocopy", [serverNodeModulesDest, appNodeModulesDest, "*.node", "/S", "/COPY:DAT", "/R:1", "/W:1", "/NFL", "/NDL", "/NJH", "/NJS"],
        { stdio: "pipe" }
      );
    } catch (err) {
      if (err.status === undefined || err.status >= 16) throw err;
    }
    // 也复制 prebuilds 目录
    try {
      execFileSync(
        "robocopy", [serverNodeModulesDest, appNodeModulesDest, "prebuilds", "/S", "/COPY:DAT", "/R:1", "/W:1", "/NFL", "/NDL", "/NJH", "/NJS"],
        { stdio: "pipe" }
      );
    } catch (err) {
      if (err.status === undefined || err.status >= 16) throw err;
    }
  }
}

// 创建 data/ 目录（空，运行时自动使用）
mkdirp(path.join(targetDir, "data"));

// 生成 start.bat
const batContent = [
  "@echo off",
  `echo ${PRODUCT_NAME} v${VERSION}`,
  `echo 数据目录: %%~dp0data`,
  "echo.",
  'cd /d "%~dp0"',
  `start "" "%~dp0${PRODUCT_NAME}.exe"`,
].join("\r\n");
fs.writeFileSync(path.join(targetDir, "start.bat"), batContent, "utf-8");

// 生成 README.txt
const readmeContent = [
  `${PRODUCT_NAME} v${VERSION} - 便携版`,
  "",
  "【使用方法】",
  "  双击 AI Novel Writing Assistant v2.exe 或 start.bat 启动程序。",
  "",
  "【数据位置】",
  "  所有数据库、配置、日志都保存在同目录下的 data/ 文件夹中。",
  "  移动本文件夹时，请连同 data/ 一起移动，数据不会丢失。",
  "",
  "【注意事项】",
  "  - 首次启动会自动创建数据库和默认配置",
  "  - 不需要安装任何依赖，解压即用",
  "  - 删除 data/ 文件夹可重置所有数据（请先备份）",
  "",
  `版本：v${VERSION}`,
  `构建时间：${new Date().toISOString()}`,
].join("\r\n");
fs.writeFileSync(path.join(targetDir, "README.txt"), readmeContent, "utf-8");

// 清理 electron-builder dist 临时产物（保留我们的 release 目录）
const builderDist = path.join(DESKTOP_DIR, "build", "dist");
if (fs.existsSync(builderDist)) {
  log(`🧹 清理 electron-builder 临时产物：${builderDist}`);
  fs.rmSync(builderDist, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------

const targetSize = getDirSize(targetDir);
const sizeMB = (targetSize / 1024 / 1024).toFixed(1);

log("");
log("✅ 构建完成！");
log(`📁 产物位置：${targetDir}`);
log(`📦 总大小：${sizeMB} MB`);
log("");
log("使用方式：");
log(`  1. 将 ${DIR_NAME}/ 文件夹复制到目标机器`);
log("  2. 双击 AI Novel Writing Assistant v2.exe 启动");
log("  3. 数据自动保存在 data/ 目录，跟随文件夹移动");

function getDirSize(dir) {
  let size = 0;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      size += getDirSize(fullPath);
    } else {
      size += fs.statSync(fullPath).size;
    }
  }
  return size;
}
