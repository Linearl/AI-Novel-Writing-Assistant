const { execFileSync } = require("node:child_process");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");

// 构建 nsis + portable 产物并显式发布到 GitHub（--publish always）。
// electron-builder 会上传全部资产（setup/portable/blockmap/latest.yml，文件名
// 规范化一致），并创建/更新 release；workflow 不再删除重建（删除会丢失
// latest.yml 且文件名与 updater 引用不一致）。release notes 由 workflow 的
// gh release edit / update-desktop-release-notes.cjs 补充。
try {
  execFileSync(process.execPath, [
    path.join("desktop", "scripts", "run-electron-builder.cjs"),
    "--win",
    "--x64",
    "--publish",
    "always",
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
