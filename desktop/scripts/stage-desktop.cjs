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
 * Windows 上 pnpm deploy 因 renameSync EPERM 问题 100% 失败，
 * 且失败后子进程仍持有文件句柄，robocopy 也无法访问。
/**
 * Windows 上 pnpm deploy 因 renameSync EPERM 问题 100% 失败，
 * 且失败后子进程仍持有文件句柄，robocopy 也无法访问。
 * 本函数完全绕过 pnpm deploy，手动构建 staging 目录。
 */
/**
 * 修复 @langchain/core 的 package.json exports 字段。
 * Electron 35 (Node.js 22) 强制执行 exports 检查，但 @langchain/core 内部
 * 代码引用了未在 exports 中声明的子路径（如 ./utils/uuid），
 * 导致 ERR_PACKAGE_PATH_NOT_EXPORTED 错误。
 * 解决方案：添加通配符导出规则。
 */
function patchLangchainCoreExports(appDir) {
  const pkgPath = path.join(appDir, "node_modules", "@langchain", "core", "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.log("[stage:desktop] @langchain/core not found, skipping exports patch");
    return;
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (!pkg.exports) return;

    // 补充缺失的子路径导出（Electron 35 Node.js 22 严格 exports 检查）
    const missingSubpaths = {
      "./utils/*": { types: "./dist/utils/*.d.ts", default: "./dist/utils/*.cjs" },
      "./errors": { types: "./dist/errors.d.ts", default: "./dist/errors.cjs" },
    };
    let patched = false;
    for (const [subpath, target] of Object.entries(missingSubpaths)) {
      if (!pkg.exports[subpath]) {
        pkg.exports[subpath] = target;
        patched = true;
      }
    }
    if (patched) {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
      console.log("[stage:desktop] patched @langchain/core: added missing subpath exports");
    }

    // 创建缺失的 utils/uuid.cjs shim（@langchain/openai 引用了此文件但 @langchain/core 未提供）
    const uuidShimPath = path.join(path.dirname(pkgPath), "dist", "utils", "uuid.cjs");
    if (!fs.existsSync(uuidShimPath)) {
      const shimContent = `// Shim: re-export uuid package for @langchain/openai compatibility\nmodule.exports = require("uuid");\n`;
      fs.mkdirSync(path.dirname(uuidShimPath), { recursive: true });
      fs.writeFileSync(uuidShimPath, shimContent);
      console.log("[stage:desktop] created @langchain/core/dist/utils/uuid.cjs shim");
    }
  } catch (err) {
    console.warn("[stage:desktop] warning: failed to patch @langchain/core exports:", err.message);
  }
}

function deployManually() {
  console.log("[stage:desktop] manual deploy: creating staging directory...");

  // 1. 创建 app/ 目录，复制 desktop 编译产物
  fs.mkdirSync(appDir, { recursive: true });
  copyDirectory(path.join(desktopDir, "dist"), path.join(appDir, "dist"));

  // 2. 创建 app/package.json（去掉 workspace 依赖和 scripts）
  const desktopPkg = JSON.parse(fs.readFileSync(path.join(desktopDir, "package.json"), "utf8"));
  const serverSourceDir = path.join(repoRoot, "server");
  const sharedSourceDir = path.join(repoRoot, "shared");
  const sharedPkg = JSON.parse(fs.readFileSync(path.join(sharedSourceDir, "package.json"), "utf8"));
  const appPkg = {
    name: desktopPkg.name,
    version: desktopPkg.version,
    private: true,
    main: "dist/main.js",
    dependencies: {
      "better-sqlite3": desktopPkg.dependencies["better-sqlite3"],
      "electron-updater": desktopPkg.dependencies["electron-updater"],
    },
  };
  fs.writeFileSync(path.join(appDir, "package.json"), JSON.stringify(appPkg, null, 2));

  // 创建 .npmrc 和 package-lock.json 阻止 npm 向上查找父目录的 workspace 配置
  fs.writeFileSync(path.join(appDir, ".npmrc"), "workspaces=false\n");
  fs.writeFileSync(path.join(appDir, "package-lock.json"), JSON.stringify({ lockfileVersion: 3, packages: {} }));

  // 3. 手动复制 @ai-novel/server 和 @ai-novel/shared 到 app/node_modules/@ai-novel/
  const serverTargetDir = path.join(appDir, "node_modules", "@ai-novel", "server");
  const sharedTargetDir = path.join(appDir, "node_modules", "@ai-novel", "shared");
  console.log(`[stage:desktop] manual deploy: copying @ai-novel/server → ${serverTargetDir}`);
  console.log(`[stage:desktop] manual deploy: copying @ai-novel/shared → ${sharedTargetDir}`);

  fs.mkdirSync(serverTargetDir, { recursive: true });
  fs.mkdirSync(sharedTargetDir, { recursive: true });

  // 复制 shared 产物（仅 dist + package.json，不需要源码）
  for (const entry of ["dist"]) {
    const src = path.join(sharedSourceDir, entry);
    const dest = path.join(sharedTargetDir, entry);
    if (fs.existsSync(src)) {
      copyDirectory(src, dest);
    }
  }
  const sharedAppPkg = {
    name: sharedPkg.name,
    version: sharedPkg.version,
    private: true,
    main: sharedPkg.main,
    types: sharedPkg.types,
    exports: sharedPkg.exports,
    dependencies: sharedPkg.dependencies || {},
  };
  fs.writeFileSync(path.join(sharedTargetDir, "package.json"), JSON.stringify(sharedAppPkg, null, 2));

  // 复制 server 核心文件（排除 package.json，后面会单独生成）
  const serverEntriesToCopy = ["dist", "prisma"];
  for (const entry of serverEntriesToCopy) {
    const src = path.join(serverSourceDir, entry);
    const dest = path.join(serverTargetDir, entry);
    if (fs.existsSync(src)) {
      copyDirectory(src, dest);
    }
  }

  // 复制 server 的 .env 文件（如果有）
  const serverEnv = path.join(serverSourceDir, ".env");
  if (fs.existsSync(serverEnv)) {
    fs.copyFileSync(serverEnv, path.join(serverTargetDir, ".env"));
  }

  // 4. 先在 app/ 目录安装生产依赖（better-sqlite3、electron-updater）
  console.log("[stage:desktop] manual deploy: installing app production dependencies...");
  execSync("npm install --production --ignore-scripts", {
    cwd: appDir,
    stdio: "inherit",
    env: process.env,
  });

  // 5. 为 @ai-novel/server 生成干净的 package.json（移除 workspace 协议依赖）
  const serverPkgRaw = JSON.parse(fs.readFileSync(path.join(serverSourceDir, "package.json"), "utf8"));
  const serverAppPkg = {
    name: serverPkgRaw.name,
    version: serverPkgRaw.version,
    private: true,
    dependencies: serverPkgRaw.dependencies || {},
  };
  // 移除 workspace 协议的依赖
  for (const [dep, ver] of Object.entries(serverAppPkg.dependencies)) {
    if (typeof ver === "string" && ver.startsWith("workspace:")) {
      delete serverAppPkg.dependencies[dep];
    }
  }
  fs.writeFileSync(path.join(serverTargetDir, "package.json"), JSON.stringify(serverAppPkg, null, 2));

  // 6. 安装 server 的生产依赖到顶层 app/node_modules（避免嵌套被 electron-builder 忽略）
  console.log("[stage:desktop] manual deploy: installing server production dependencies at top level...");
  const serverDeps = serverAppPkg.dependencies || {};
  const installArgs = Object.entries(serverDeps)
    .filter(([_, ver]) => typeof ver === "string" && !ver.startsWith("workspace:"))
    .map(([name, ver]) => `${name}@${ver}`)
    .join(" ");
  if (installArgs) {
    execSync(`npm install --no-save --ignore-scripts --legacy-peer-deps ${installArgs}`, {
      cwd: appDir,
      stdio: "inherit",
      env: process.env,
    });
  }

  // 7. 最后将 @ai-novel/server 加入 package.json dependencies
  //    electron-builder 根据 dependencies 决定包含哪些 node_modules 到最终包中
  const stagedPkgPath = path.join(appDir, "package.json");
  const stagedPkg = JSON.parse(fs.readFileSync(stagedPkgPath, "utf8"));
  stagedPkg.dependencies["@ai-novel/server"] = serverPkgRaw.version || "0.1.0";
  fs.writeFileSync(stagedPkgPath, JSON.stringify(stagedPkg, null, 2));
  console.log("[stage:desktop] added @ai-novel/server to staging package.json for electron-builder");

  // 8. 修复 @langchain/core exports 缺失的子路径（Electron 35 严格 exports 检查）
  patchLangchainCoreExports(appDir);

  console.log("[stage:desktop] manual deploy completed successfully");
}

function ensureCleanDir(targetDir) {
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.mkdirSync(targetDir, { recursive: true });
}

function ensureDir(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
}

/**
 * 跨平台文件/目录复制。
 * - 文件：直接用 fs.copyFileSync
 * - 目录：Windows 上用 robocopy（比 fs.cpSync 更健壮，避免 0xC0000005 崩溃）
 */
function copyDirectory(sourceDir, targetDir) {
  const stat = fs.statSync(sourceDir);
  if (stat.isFile()) {
    // 文件复制：确保目标目录存在
    fs.mkdirSync(path.dirname(targetDir), { recursive: true });
    fs.copyFileSync(sourceDir, targetDir);
    return;
  }

  // 目录复制
  if (process.platform === "win32") {
    try {
      execSync(
        `robocopy "${sourceDir}" "${targetDir}" /E /COPY:DAT /R:1 /W:1 /NFL /NDL /NJH /NJS`,
        { stdio: "pipe" }
      );
    } catch (err) {
      // robocopy 返回码 0-7 都表示成功（部分/全部复制）
      if (err.status !== undefined && err.status <= 7) return;
      throw err;
    }
  } else {
    fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });
  }
}

/**
 * 将目录替换为物理副本（消除 pnpm 符号链接）。
 * Windows 上使用 robocopy + robocopy 两步复制替代 renameSync。
 */
function replaceDirectoryWithPhysicalCopy(targetDir) {
  const tempDir = `${targetDir}.__detached__`;
  fs.rmSync(tempDir, { recursive: true, force: true });

  if (process.platform === "win32") {
    // robocopy 复制到临时目录
    try {
      execSync(`robocopy "${targetDir}" "${tempDir}" /E /COPY:DAT /R:1 /W:1 /NFL /NDL /NJH /NJS`, { stdio: "pipe" });
    } catch (err) {
      if (err.status === undefined || err.status > 7) throw err;
    }
    fs.rmSync(targetDir, { recursive: true, force: true });
    // robocopy 从临时目录复制回来（避免 renameSync 的 EPERM 问题）
    try {
      execSync(`robocopy "${tempDir}" "${targetDir}" /E /COPY:DAT /R:1 /W:1 /NFL /NDL /NJH /NJS`, { stdio: "pipe" });
    } catch (err) {
      if (err.status === undefined || err.status > 7) throw err;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  } else {
    fs.cpSync(targetDir, tempDir, { recursive: true, force: true });
    fs.rmSync(targetDir, { recursive: true, force: true });
    fs.renameSync(tempDir, targetDir);
  }
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

/**
 * 查找 @prisma/client 包目录，支持三种风格：
 * 1. pnpm: .pnpm/@prisma+client@版本/node_modules/@prisma/client
 * 2. npm 顶层: node_modules/@prisma/client
 * 3. npm 嵌套: node_modules/@ai-novel/server/node_modules/@prisma/client
 */
function resolveStagedPrismaClientPackageDirs() {
  const pnpmVirtualStoreDir = path.join(stagedNodeModulesDir, ".pnpm");

  // pnpm 风格
  if (fs.existsSync(pnpmVirtualStoreDir)) {
    const prismaClientStoreEntries = fs
      .readdirSync(pnpmVirtualStoreDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("@prisma+client@"));

    if (prismaClientStoreEntries.length > 0) {
      return prismaClientStoreEntries.map((entry) => ({
        storeEntryName: entry.name,
        packageDir: path.join(pnpmVirtualStoreDir, entry.name, "node_modules", "@prisma", "client"),
      }));
    }
  }

  // npm 顶层风格
  const npmPrismaClientDir = path.join(stagedNodeModulesDir, "@prisma", "client");
  if (fs.existsSync(npmPrismaClientDir)) {
    return [{ storeEntryName: "@prisma+client", packageDir: npmPrismaClientDir }];
  }

  // npm 嵌套风格：@ai-novel/server/node_modules/@prisma/client
  const nestedPrismaClientDir = path.join(
    stagedNodeModulesDir, "@ai-novel", "server", "node_modules", "@prisma", "client"
  );
  if (fs.existsSync(nestedPrismaClientDir)) {
    return [{ storeEntryName: "@prisma+client", packageDir: nestedPrismaClientDir }];
  }

  throw new Error("Expected @prisma/client in staged node_modules (pnpm, npm flat, or npm nested style).");
}

/**
 * 按包名查找包目录，支持 pnpm 风格（.pnpm/）和 npm 风格（flat node_modules/）。
 */
function resolveStagedPackageDirsByName(packageName) {
  const results = [];

  // pnpm 风格：.pnpm/{name}@*/node_modules/{name}
  const pnpmVirtualStoreDir = path.join(stagedNodeModulesDir, ".pnpm");
  if (fs.existsSync(pnpmVirtualStoreDir)) {
    const matches = fs
      .readdirSync(pnpmVirtualStoreDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith(`${packageName}@`))
      .map((entry) => path.join(pnpmVirtualStoreDir, entry.name, "node_modules", packageName))
      .filter((packageDir) => fs.existsSync(packageDir));
    results.push(...matches);
  }

  // npm 风格：node_modules/{name}
  const npmDir = path.join(stagedNodeModulesDir, packageName);
  if (fs.existsSync(npmDir) && !results.includes(npmDir)) {
    results.push(npmDir);
  }

  return Array.from(new Set(results));
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

/**
 * 同步 Prisma 运行时文件到 staging 目录。
 * 支持 pnpm 风格、npm 顶层风格、npm 嵌套风格。
 */
function syncPrismaRuntime() {
  const generatedPrismaDir = resolveWorkspacePrismaGeneratedDir();
  const stagedTopLevelPrismaDir = path.join(stagedNodeModulesDir, ".prisma");
  const stagedPrismaClientPackages = resolveStagedPrismaClientPackageDirs();

  copyDirectory(generatedPrismaDir, stagedTopLevelPrismaDir);

  const isPnpmStyle = fs.existsSync(path.join(stagedNodeModulesDir, ".pnpm"));

  for (const { storeEntryName, packageDir } of stagedPrismaClientPackages) {
    if (isPnpmStyle) {
      // pnpm 风格
      const nestedPrismaDir = path.join(stagedNodeModulesDir, ".pnpm", storeEntryName, "node_modules", ".prisma");
      const packageLocalPrismaDir = path.join(
        stagedNodeModulesDir, ".pnpm", storeEntryName, "node_modules",
        "@prisma", "client", "node_modules", ".prisma",
      );
      copyDirectory(generatedPrismaDir, nestedPrismaDir);
      copyDirectory(generatedPrismaDir, packageLocalPrismaDir);
    } else {
      // npm 风格：确定 packageDir 的父级 node_modules 目录
      const parentNm = path.dirname(packageDir); // .../@prisma
      const grandParentNm = path.dirname(parentNm); // .../node_modules
      const packageLocalPrismaDir = path.join(packageDir, "node_modules", ".prisma");

      // 在 packageDir 的父级 node_modules 中也放一份 .prisma
      copyDirectory(generatedPrismaDir, path.join(grandParentNm, ".prisma"));
      copyDirectory(generatedPrismaDir, packageLocalPrismaDir);
    }

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

  // Windows 上 pnpm deploy 因 renameSync EPERM 问题 100% 失败，
  // 直接使用手动部署方案绕过 pnpm deploy。
  if (process.platform === "win32") {
    console.log("[stage:desktop] detected Windows, using manual deploy (bypass pnpm deploy EPERM)");
    deployManually();
  } else {
    runPnpm([
      "--filter",
      "@ai-novel/desktop",
      "deploy",
      "--prod",
      appDir,
    ]);
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
