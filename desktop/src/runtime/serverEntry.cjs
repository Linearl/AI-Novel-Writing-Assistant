/**
 * Server entry wrapper for packaged desktop mode。
 * 先加载路径别名 shim，再启动实际 server。
 */
const path = require("path");
const fs = require("fs");

// 加载 @/ 路径别名 shim
const shimPath = path.join(__dirname, "pathAliasShim.js");
if (fs.existsSync(shimPath)) {
  require(shimPath);
}

// 加载实际的 server 入口
require("@ai-novel/server/dist/app.js");
