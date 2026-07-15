const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const desktopDir = path.resolve(__dirname, "..");
const buildDir = path.join(desktopDir, "build");
const appDir = path.join(buildDir, "app");
const resourcesDir = path.join(buildDir, "resources");
const appUpdateConfigPath = path.join(resourcesDir, "app-update.yml");
const clientSourceDir = path.join(repoRoot, "client", "dist");
const clientTargetDir = path.join(resourcesDir, "client", "dist");
const serverEntry = path.join(appDir, "node_modules", "@ai-novel", "server", "dist", "app.js");
const desktopMainEntry = path.join(appDir, "dist", "main.js");
const stagedNodeModulesDir = path.join(appDir, "node_modules");
const stagedNativePackagesToDetach = ["better-sqlite3"];
const prismaClientEntrypointFiles = [
  { fileName: "default.js", generatedEntry: "./generated-client/default" },
  { fileName: "index.js", generatedEntry: "./generated-client/index" },
  { fileName: "edge.js", generatedEntry: "./generated-client/edge" },
];

function runPnpm(args, cwd = repoRoot) {
  const command = `pnpm ${args.map((arg) => `"${arg}"`).join(" ")}`;
  execSync(command, {
    cwd,
    stdio: "inherit",
    env: process.env,
    shell: true,
  });
}

/**
 * Windows 上 pnpm deploy 的 renameSync 存在 EPERM 问题，
 * 用 robocopy /MOVE 替代 rename 完成 app_tmp → app 的搬运。
 */
function moveDirectoryRobocopy(sourceDir, targetDir) {
  if (process.platform !== "win32") {
    fs.renameSync(sourceDir, targetDir);
    return;
  }
  // robocopy /MOVE: 复制后删除源目录，等效于 rename
  // /E: 包含子目录，/R:1: 失败重试1次，/W:1: 重试间隔1秒，/NFL /NDL /NJH /NJS: 静默输出
  try {
    execSync(
      `robocopy "${sourceDir}" "${targetDir}" /E /MOVE /R:1 /W:1 /NFL /NDL /NJH /NJS`,
      { stdio: "pipe" }
    );
    // robocopy 返回码 0-7 都表示成功（部分/全部复制）
    if (!fs.existsSync(targetDir)) {
      throw new Error(`robocopy 完成但目标目录不存在: ${targetDir}`);
    }
  } catch (err) {
    // robocopy 返回码 >7 才是错误
    if (err.status !== undefined && err.status <= 7 && fs.existsSync(targetDir)) {
      return; // 成功
    }
    throw err;
  }
}

function ensureCleanDir(targetDir) {
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });
}

function ensureDir(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function copyDirectory(sourceDir, targetDir) {
  fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });
}

function replaceDirectoryWithPhysicalCopy(targetDir) {
  const tempDir = `${targetDir}.__detached__`;
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.cpSync(targetDir, tempDir, { recursive: true, force: true });
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.renameSync(tempDir, targetDir);
}

function replaceFileContents(targetPath, contents) {
  fs.rmSync(targetPath, { force: true });
  fs.writeFileSync(targetPath, contents, "utf8");
}

function writeDesktopUpdaterConfig() {
  const releaseChannel = (process.env.AI_NOVEL_RELEASE_CHANNEL || "beta").trim().toLowerCase();
  const releaseType = releaseChannel === "beta" ? "prerelease" : "release";
  const owner = (process.env.AI_NOVEL_GITHUB_OWNER || "ExplosiveCoderflome").trim();
  const repo = (process.env.AI_NOVEL_GITHUB_REPO || "AI-Novel-Writing-Assistant").trim();
  const config = [
    "provider: github",
    `owner: ${owner}`,
    `repo: ${repo}`,
    `channel: ${releaseChannel}`,
    `releaseType: ${releaseType}`,
    "updaterCacheDirName: ai-novel-writing-assistant-v2-updater",
    "",
  ].join("\n");
  fs.writeFileSync(appUpdateConfigPath, config, "utf8");
}

function resolveWorkspacePrismaGeneratedDir() {
  const pnpmVirtualStoreDir = path.join(repoRoot, "node_modules", ".pnpm");
  assertExists(pnpmVirtualStoreDir, "workspace virtual store");

  const prismaClientStoreEntries = fs
    .readdirSync(pnpmVirtualStoreDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("@prisma+client@"));

  for (const entry of prismaClientStoreEntries) {
    const generatedDir = path.join(pnpmVirtualStoreDir, entry.name, "node_modules", ".prisma");
    if (fs.existsSync(path.join(generatedDir, "client", "default.js"))) {
      return generatedDir;
    }
  }

  throw new Error(`Expected a generated Prisma runtime directory under ${pnpmVirtualStoreDir}, but none was found.`);
}

function resolveStagedPrismaClientPackageDirs() {
  const pnpmVirtualStoreDir = path.join(stagedNodeModulesDir, ".pnpm");
  assertExists(pnpmVirtualStoreDir, "staged virtual store");

  const prismaClientStoreEntries = fs
    .readdirSync(pnpmVirtualStoreDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("@prisma+client@"));

  if (prismaClientStoreEntries.length === 0) {
    throw new Error("Expected at least one staged @prisma/client package in the virtual store.");
  }

  return prismaClientStoreEntries.map((entry) => ({
    storeEntryName: entry.name,
    packageDir: path.join(pnpmVirtualStoreDir, entry.name, "node_modules", "@prisma", "client"),
  }));
}

function resolveStagedPackageDirsByName(packageName) {
  const pnpmVirtualStoreDir = path.join(stagedNodeModulesDir, ".pnpm");
  assertExists(pnpmVirtualStoreDir, "staged virtual store");

  const matches = fs
    .readdirSync(pnpmVirtualStoreDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(`${packageName}@`))
    .map((entry) => path.join(pnpmVirtualStoreDir, entry.name, "node_modules", packageName))
    .filter((packageDir) => fs.existsSync(packageDir));

  return Array.from(new Set(matches));
}

function patchPrismaClientEntrypoint(entrypointPath, generatedEntry) {
  const entrypointSource = `module.exports = {
  ...require('${generatedEntry}'),
}
`;

  replaceFileContents(entrypointPath, entrypointSource);
}

function embedPrismaGeneratedClient(prismaClientPackageDir, generatedPrismaDir) {
  const generatedPrismaClientDir = path.join(generatedPrismaDir, "client");
  const embeddedGeneratedClientDir = path.join(prismaClientPackageDir, "generated-client");
  const prismaClientPackageJsonPath = path.join(prismaClientPackageDir, "package.json");
  const prismaClientPackageJson = JSON.parse(fs.readFileSync(prismaClientPackageJsonPath, "utf8"));

  copyDirectory(generatedPrismaClientDir, embeddedGeneratedClientDir);

  if (!Array.isArray(prismaClientPackageJson.files)) {
    prismaClientPackageJson.files = [];
  }
  if (!prismaClientPackageJson.files.includes("generated-client")) {
    prismaClientPackageJson.files.push("generated-client");
  }

  replaceFileContents(prismaClientPackageJsonPath, `${JSON.stringify(prismaClientPackageJson, null, 2)}\n`);

  for (const { fileName, generatedEntry } of prismaClientEntrypointFiles) {
    patchPrismaClientEntrypoint(path.join(prismaClientPackageDir, fileName), generatedEntry);
  }
}

function syncPrismaRuntime() {
  const generatedPrismaDir = resolveWorkspacePrismaGeneratedDir();
  const stagedTopLevelPrismaDir = path.join(stagedNodeModulesDir, ".prisma");
  const stagedPrismaClientPackages = resolveStagedPrismaClientPackageDirs();

  copyDirectory(generatedPrismaDir, stagedTopLevelPrismaDir);

  for (const { storeEntryName, packageDir } of stagedPrismaClientPackages) {
    const nestedPrismaDir = path.join(stagedNodeModulesDir, ".pnpm", storeEntryName, "node_modules", ".prisma");
    const packageLocalPrismaDir = path.join(
      stagedNodeModulesDir,
      ".pnpm",
      storeEntryName,
      "node_modules",
      "@prisma",
      "client",
      "node_modules",
      ".prisma",
    );
    copyDirectory(generatedPrismaDir, nestedPrismaDir);
    copyDirectory(generatedPrismaDir, packageLocalPrismaDir);
    embedPrismaGeneratedClient(packageDir, generatedPrismaDir);
  }
}

function detachStagedNativePackages() {
  for (const packageName of stagedNativePackagesToDetach) {
    for (const packageDir of resolveStagedPackageDirsByName(packageName)) {
      replaceDirectoryWithPhysicalCopy(packageDir);
    }
  }
}

function assertExists(targetPath, description) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Expected ${description} at ${targetPath}, but it was not found.`);
  }
}

function main() {
  assertExists(clientSourceDir, "built client assets");

  ensureCleanDir(buildDir);
  ensureDir(resourcesDir);
  ensureDir(path.dirname(clientTargetDir));

  // pnpm deploy 在 Windows 上因 renameSync EPERM 问题经常失败，
  // 需要 catch 错误后用 robocopy /MOVE 手动完成 app_tmp → app 的搬运。
  let deploySucceeded = false;
  try {
    runPnpm([
      "--filter",
      "@ai-novel/desktop",
      "deploy",
      "--prod",
      appDir,
    ]);
    deploySucceeded = true;
  } catch (deployError) {
    console.warn("[stage:desktop] pnpm deploy failed, attempting robocopy fallback...");

    // 查找残留的 app_tmp_* 目录（最新的）
    const appTmpDirs = fs
      .readdirSync(buildDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && e.name.startsWith("app_tmp_"))
      .map((e) => path.join(buildDir, e.name))
      .sort((a, b) => {
        const timeA = fs.statSync(a).mtimeMs;
        const timeB = fs.statSync(b).mtimeMs;
        return timeB - timeA; // 最新的在前
      });

    if (appTmpDirs.length === 0) {
      console.error("[stage:desktop] no app_tmp_* directories found after pnpm deploy failure");
      throw deployError;
    }

    const latestTmp = appTmpDirs[0];
    console.log(`[stage:desktop] robocopy fallback: ${latestTmp} → ${appDir}`);

    // 等待 pnpm 子进程释放文件句柄（Windows 特有：pnpm renameSync 失败后子进程仍持有句柄）
    // 使用 Node.js 原生 Atomics.wait，不依赖任何 shell 命令
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000);

    // 用 robocopy /MOVE 完成搬运（完全绕过 Node.js renameSync）
    moveDirectoryRobocopy(latestTmp, appDir);

    // 清理其他残留的 app_tmp_* 目录
    for (const tmpDir of appTmpDirs.slice(1)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }

    deploySucceeded = true;
  }

  if (!deploySucceeded) {
    throw new Error("pnpm deploy and robocopy fallback both failed");
  }

  copyDirectory(clientSourceDir, clientTargetDir);
  writeDesktopUpdaterConfig();
  syncPrismaRuntime();
  detachStagedNativePackages();

  assertExists(desktopMainEntry, "desktop main bundle");
  assertExists(serverEntry, "bundled server entry");
  assertExists(path.join(clientTargetDir, "index.html"), "bundled renderer entry");
  assertExists(appUpdateConfigPath, "desktop updater configuration");
  assertExists(path.join(stagedNodeModulesDir, ".prisma", "client", "default.js"), "bundled Prisma runtime");
  const [firstStagedPrismaClientPackage] = resolveStagedPrismaClientPackageDirs();
  assertExists(
    path.join(firstStagedPrismaClientPackage.packageDir, "node_modules", ".prisma", "client", "default.js"),
    "bundled Prisma runtime beside @prisma/client",
  );
  assertExists(
    path.join(firstStagedPrismaClientPackage.packageDir, "generated-client", "default.js"),
    "embedded generated Prisma client",
  );

  console.log(`[stage:desktop] app staged at ${appDir}`);
  console.log(`[stage:desktop] renderer resources staged at ${clientTargetDir}`);
}

try {
  main();
} catch (error) {
  console.error("[stage:desktop] failed.", error);
  process.exit(1);
}
