const { execFileSync } = require("node:child_process");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");

// 构建 nsis + portable 产物，但不发布到 GitHub（发布由 workflow 的 gh release create 完成，
// 避免 electron-builder GitHub publisher 创建 draft release 且不发布的兼容问题）。
try {
  execFileSync(process.execPath, [
    path.join("desktop", "scripts", "run-electron-builder.cjs"),
    "--win",
    "--x64",
  ], {
    cwd: repoRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      AI_NOVEL_RELEASE_CHANNEL: "release",
    },
  });
} catch (error) {
  console.error("[publish:desktop:release] failed.", error);
  process.exit(1);
}
