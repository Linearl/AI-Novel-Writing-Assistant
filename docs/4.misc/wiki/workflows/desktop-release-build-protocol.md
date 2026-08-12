# 桌面 Release 构建与发布运行协议

## 背景

2026-08-10 首次通过 GitHub Actions 发布桌面端 v0.1.0 时连续失败 5 次，暴露了三条此前只在本地打包流程（`build-portable.cjs`）中隐式成立、CI 从未验证的契约：

1. 运行时需要 asar 外的 `resources/node_modules`（`NODE_PATH` 指向），但 `stage-desktop.cjs` 不负责生成它；
2. seed 数据库的复制路径与运行时实际打开的数据库路径不一致（双重 `data/` 层级）；
3. electron-builder 的 GitHub publisher 在 CI 上创建 draft release 后不发布，产物永远不可下载。

此外还有两个环境问题：GitHub runner 上 node-gyp 11 不识别 VS 2026（18.x），以及 VS 工具链未显式启用。

这些问题此前从未暴露，是因为本地 `release/` 产物由 `build-portable.cjs` 的后处理步骤补齐，且本地构建目录（`desktop/build/`）长期残留旧产物掩盖了缺失。

## 决策

CI 发布流程采用**两条路径合并**的稳定设计：

- **打包**：`stage-desktop.cjs`（生成 asar 外 node_modules + rebuild 原生模块）→ electron-builder 构建 nsis + portable 产物（**只构建，不发布**）。
- **发布**：workflow 内用 `gh release create` 上传产物并创建正式 release（GITHUB_TOKEN 具备 `contents: write` 权限，不依赖 electron-builder 的 publisher）。

## 当前规则

### 1. asar 外 node_modules 契约（运行时 NODE_PATH）

- 桌面运行时 `desktop/src/runtime/server.ts` 通过 `NODE_PATH` 指向 `resources/node_modules`（asar 外）加载 `better-sqlite3` 等原生模块。
- `stage-desktop.cjs` 在 `detachStagedNativePackages()` 之后、断言之前，必须：
  1. 在 `build/app` 中先执行 `@electron/rebuild --version 35.7.5 --arch x64 --module-dir <appDir> --only better-sqlite3 --force`（**先 rebuild 再复制**，保证 `.node` 编译产物进副本）；
  2. 用 robocopy（Windows）把 `build/app/node_modules` 整体复制到 `build/resources/node_modules`。
- `electron-builder.config.cjs` 的 `extraResources` 必须包含 `build/resources/node_modules → resources/node_modules`。
- 禁止修改 `files` 把 `better-sqlite3` 排除出 asar 之外还指望 `asarUnpack` 生效——`files` 排除优先于 `asarUnpack`，被排除的文件不会进入打包。
- 验证方式：产物启动后 `data/logs/desktop-main.log` 应出现 `better-sqlite3: ✅ exists`、`better_sqlite3.node: ✅ exists`。

### 2. seed 数据库路径（data 层级）

- 桌面 server 进程 cwd 被 runtime 设为 `<appDataDir>/data`（`resolveDesktopAppDataDir()/data`），`DATABASE_URL=file:./dev.db` 相对该 cwd 解析。
- bootstrap 注入代码（`stage-desktop.cjs` 内嵌的 `__desktop_bootstrap_injected__`）复制 seed 时必须用 **`process.cwd()/dev.db`**，不要用 `AI_NOVEL_APP_DATA_DIR` 直接拼接（会少一层 `data`，产生 `data/data/dev.db` 与 `data/dev.db` 双库）。
- 运行时迁移打开的是 `resolveDataRoot()/dev.db` = `<appDataDir>/data/dev.db`；seed 复制到别的路径会导致迁移在空库上执行，报 `no such table: main.DramaEpisode` 之类。

### 3. 发布机制：gh release create

- `desktop/scripts/publish-desktop-release.cjs` 只调用 `run-electron-builder.cjs --win --x64`（**不带 `--publish`**），产出 `desktop/build/dist/*.exe`。
- workflow（`.github/workflows/desktop-release.yml`）在 Publish 步骤后：
  1. `gh release delete $tag --yes --cleanup-tag`（清理失败残留的 draft/同名 release）；
  2. `gh release create $tag <setup> <portable> --title ... --notes ...`。
- `scripts/update-desktop-release-notes.cjs` 的 `GET /releases/tags/<tag>` 必须带重试（最多 12 次 × 15 秒），因为 GitHub API 对刚创建的 release 有最终一致性延迟，直接查询会 404。

### 4. 版本一致性

- `desktop/package.json` 的 `version` 必须与 release tag 的 `vX.Y.Z` **字符串完全一致**（如 `0.1.0` ↔ `v0.1.0`）。
- 禁止用 `0.1.00` 这类 semver 等价但字符串不同的版本：electron-builder 会按 semver 规范化成 `0.1.0`，导致 release tag、产物文件名、notes 脚本三者各说各话。
- bump 版本用 `node scripts/desktop/bump-version.cjs <X.Y.Z>`；若目标与当前 semver 相等（如 `0.1.0` → `0.1.00`）会被拒绝，属预期。

### 5. CI 环境（node-gyp / MSVC）

- GitHub windows-latest runner 预装 VS 2026（18.x），但 node-gyp 11 只认 major 15/16/17，必须用 `pnpm.overrides` 强制 `node-gyp@^13.0.1`（支持 `versionMajor === 18 → 2026`）。
- workflow 在 `Setup Python` 后必须加 `ilammy/msvc-dev-cmd@v1` 启用 MSVC 工具链，否则 `@electron/rebuild` 编译 `better-sqlite3` 时报 `Could not find any Visual Studio installation to use`。
- `@electron/rebuild` CLI 入口是 `lib/cli.js`（不是 `cli.js`），`--module-dir` 传**含 package.json 的项目根**（`build/app`），不是 node_modules 本身。

## 示例

推荐做法（发布前本地验证）：

```bash
# 1. 完整本地构建 + 打包
node scripts/desktop/build-portable.cjs            # 或 --reuse-stage 复用 stage

# 2. 启动产物验证（关键！）
cd release/ai-novel-desktop-v0.1.0 && "./AI Novel Writing Assistant v2.exe"
# 检查：进程存活、netstat 14250 LISTENING、data/logs/desktop-main.log 出现
# "Desktop server is healthy at http://127.0.0.1:14250/api/health"

# 3. CI 发布（打 tag 触发 workflow）
node scripts/desktop/trigger-release.cjs --dry-run # 先校验
node scripts/desktop/trigger-release.cjs           # 打 tag + 推送
```

不推荐做法：

- 用 `git add -A` 提交（会把 `.github/` 等 gitignore 文件之外的临时文件混入；`.github/` 需 `git add -f`）。
- 修改 `files` 排除 better-sqlite3 而不在 stage 生成 asar 外 node_modules。
- 删除 tag 重建来"刷新"release——应先 `gh release delete --cleanup-tag` 再重建。

## 失败模式

| 现象 | 根因 | 排查路径 |
|------|------|----------|
| 启动报 `Cannot find module 'better-sqlite3'` | asar 外 node_modules 未打包 | 检查 `resources/node_modules/better-sqlite3/build/Release/better_sqlite3.node` 是否存在；检查 stage 日志 `resources/node_modules staged` |
| `no such table: main.DramaEpisode` | seed 复制路径与运行时库不一致（双重 data） | 对比 `data/dev.db` 与 `data/data/dev.db` 的存在与迁移记录 |
| release 页显示 "Assets 2" 但下载 404 | draft release 未发布 | 用 `gh release view <tag>` 看 `draft` 字段；改用 gh release create |
| notes 脚本 `GET /releases/tags/... 404` | API 最终一致性延迟 或 版本字符串不一致 | 加重试；核对 `desktop/package.json` version 与 tag |
| `Could not find any Visual Studio installation` | node-gyp 11 不认 VS 18 / 工具链未启用 | 升级 node-gyp 13 + `ilammy/msvc-dev-cmd` |
| 产物名带点（`AI.Novel.Writing.Assistant.v2-...`） | electron-builder 规范化 productName | 属正常，以 release 页资产名为准 |
| stage 日志 `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`（overrides 与 lockfile 校验冲突） | pnpm 10.6 `deploy` 强制 frozen 校验，overrides 配置与 lockfile 序列化不一致 | **不要修**：接受 stage 自动 fallback 到 manual deploy（npm install 两轮，约 6 分钟，已验证成功）。曾尝试 `.npmrc` 加 `force-legacy-deploy=true`（pnpm 官方 workaround），但 CI windows-latest 上 legacy deploy 卡死 17+ 分钟未完成（run 31478381355），必须回退该配置 |
| Build and stage 步骤超过 10 分钟无进展 | 若最近改动含 `force-legacy-deploy=true`，即为此失败模式 | 立即 revert `.npmrc`，重新打 tag 触发 CI；用 `env -u GITHUB_TOKEN gh run cancel` 取消卡住的 run（fine-grained PAT 无 cancel 权限） |

## 相关模块

- `desktop/scripts/stage-desktop.cjs` — stage + asar 外 node_modules + bootstrap 注入
- `desktop/scripts/publish-desktop-release.cjs` — 只构建不发布
- `desktop/scripts/run-electron-builder.cjs` — electron-builder 封装（含 NSIS 模板补丁）
- `desktop/electron-builder.config.cjs` — files / extraResources / asarUnpack
- `desktop/src/runtime/server.ts`、`desktop/src/runtime/paths.ts` — NODE_PATH、data 目录解析
- `server/src/db/runtimeMigrations.ts` — 运行时迁移（applyMigration / isMigrationRecorded）
- `.github/workflows/desktop-release.yml`、`desktop-beta-release.yml` — CI 发布
- `scripts/update-desktop-release-notes.cjs` — release notes 写入（带重试）
- `scripts/desktop/build-portable.cjs` — 本地便携版构建（含 asar patch 后处理）

## 来源文档

- 桌面版本号与发布标识规则：`../workflows/desktop-release-versioning.md`
- Release Notes 工作流：`../workflows/release-notes-workflow.md`
- 2026-08-10 v0.1.0 首次 CI 发布排障记录（5 次失败根因）
