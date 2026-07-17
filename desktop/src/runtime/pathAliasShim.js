/**
 * 轻量级路径别名解析 shim。
 * 在 Electron production 模式下解析 @/ 路径别名到 server 编译产物。
 * 替代 tsconfig-paths，无外部依赖。
 */
const Module = require("module");
const path = require("path");
const fs = require("fs");

// shim 位于 app.asar/dist/pathAliasShim.js
// server 位于 app.asar/node_modules/@ai-novel/server/dist/
// @/ 别名解析到 server 根目录（即 app.asar/node_modules/@ai-novel/server/）
function findServerRoot() {
  // 方法1: 从当前 shim 位置推断 asar 根目录
  const shimDir = __dirname; // app.asar/dist
  const asarRoot = path.dirname(shimDir); // app.asar
  const serverDist = path.join(asarRoot, "node_modules", "@ai-novel", "server", "dist");
  if (fs.existsSync(serverDist)) {
    return path.join(asarRoot, "node_modules", "@ai-novel", "server");
  }
  // 方法2: 通过 require.resolve 查找
  try {
    const serverApp = require.resolve("@ai-novel/server/dist/app.js");
    return path.dirname(path.dirname(serverApp));
  } catch {
    return null;
  }
}

const serverRoot = findServerRoot();
if (serverRoot) {
  console.error("[pathAliasShim] server root: " + serverRoot);
  const originalResolve = Module._resolveFilename;
  Module._resolveFilename = function patchResolve(request, parent, isMain, options) {
    if (request.startsWith("@/")) {
      const relPath = request.slice(2); // 去掉 "@/"
      // @/ 别名映射到 server/src/ → 编译产物在 server/dist/
      const candidates = [
        path.join(serverRoot, "dist", relPath),
        path.join(serverRoot, "dist", relPath + ".js"),
        path.join(serverRoot, "dist", relPath, "index.js"),
        path.join(serverRoot, relPath),
        path.join(serverRoot, relPath + ".js"),
      ];
      for (const candidate of candidates) {
        try {
          return originalResolve.call(this, candidate, parent, isMain, options);
        } catch {
          // 继续尝试下一个候选路径
        }
      }
    }
    return originalResolve.call(this, request, parent, isMain, options);
  };
  console.error("[pathAliasShim] @/ alias patch installed");
} else {
  console.error("[pathAliasShim] WARNING: server root not found, @/ alias disabled");
}
