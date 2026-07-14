# 桌面版本号与发布标识规则

## Background

桌面客户端有三处会暴露版本信息：界面顶部的当前版本、Electron 打包产物的应用版本、GitHub Release 的发布 tag。如果这些信息分别维护，用户截图、安装包文件名和自动更新判断会很容易出现不一致。

## Current Rule

- `desktop/package.json` 的 `version` 是桌面客户端唯一版本源。
- 前端网页开发态从 Vite 注入的 `VITE_APP_VERSION` 读取该版本，桌面运行态优先读取 Electron runtime 提供的 `appVersion`。
- 正式发布 tag 必须是 `vX.Y.Z`，并且 `X.Y.Z` 必须等于 `desktop/package.json` 的 `version`。
- 不在 UI、README 或发布脚本中硬编码另一个客户端版本号。
- GitHub 桌面发布 workflow 必须使用 Node 24 运行时和 Node 24 代际的官方 action，不再依赖 `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` 去强制旧 Node 20 action。

## 桌面打包上传规则

- 公开桌面包上传到 GitHub Releases 仅在发布版本由 `desktop/package.json` 驱动且 Git 标签恰好为 `vX.Y.Z` 时允许。
- 任何公开桌面上传前，验证 `desktop/package.json` 的 `version` 是稳定的 semver（如 `0.2.3`），无 `desktop-` 前缀、无 `-r1` 风格后缀、无仅分支命名混入版本字段。
- 推送的发布标签在添加 `v` 前缀后必须与 `desktop/package.json` 完全匹配。例如：`desktop/package.json` 为 `0.2.3`，则唯一允许的公开发布标签是 `v0.2.3`。
- 不得使用 `desktop-vX.Y.Z-rN`、`desktop-v*`、分支名、对 `main` 的 workflow dispatch 或任何其他不匹配的 ref 作为公开桌面 GitHub Release 上传的标识符。
- 如果构建手动触发或从不匹配的标签触发，将其视为验证或打包，不得视为有效的公开发布上传。
- 如果所需的 `vX.Y.Z` 标签和 `desktop/package.json` 版本未对齐，在上传前停止，先修复版本/标签对，然后重新运行发布流程。
- 当请求打包且没有明确的、当前的、仓库特定的知识表明需要本地打包时，优先触发 GitHub 侧的打包工作流，而不是发明本地打包步骤。
- 不要仅为了猜测发布流程而运行本地桌面打包。本地打包仅在用户明确请求本地产物、任务是打包验证或相关文档/脚本明确要求本地暂存时适用。
- GitHub 侧打包仍需遵守上述版本/标签规则。如果正确的工作流、标签、分支或版本不明确，在触发打包前停止并验证发布标识符。

## Release Steps

1. 发新版桌面包前，先运行 `pnpm release:desktop:bump X.Y.Z` 更新 `desktop/package.json`。
2. 更新用户可见 release notes 和 README 最新更新，说明该版本面向用户的变化。
3. 合入 `main` 后运行 `node scripts/trigger-desktop-release.cjs --dry-run`，确认工作区、分支和 tag 规则都通过。
4. 只使用与 `desktop/package.json` 对齐的 `vX.Y.Z` tag 触发正式 GitHub Release。

## Failure Modes

- 如果界面顶部显示版本和安装包文件名不一致，先检查打包所用 commit 的 `desktop/package.json`，不要在前端组件里补一个临时版本。
- 如果 GitHub Release tag 已存在，不能复用同一个版本重新上传；应继续 bump 到新的 `X.Y.Z`。
- 如果发版前只更新 release notes 但没有 bump 桌面版本，自动更新链路会把新包识别成旧版本，必须先修正版本源再发布。
- 如果 GitHub Actions 提示某个 action 仍在使用 Node 20，应优先升级该 action 的 major 版本，而不是重新加入强制运行时环境变量。

## Related Modules

- `client/vite.config.ts`：把桌面版本注入网页开发态和普通前端构建。
- `client/src/lib/constants.ts`：统一导出前端可用的 `APP_VERSION`。
- `desktop/src/main.ts`：桌面运行态把 Electron `app.getVersion()` 注入 renderer。
- `scripts/bump-desktop-version.cjs` 与 `scripts/trigger-desktop-release.cjs`：版本推进与正式发布 tag 校验。

## 来源文档

- 「桌面打包上传规则」迁移自 `AGENTS.md`（2026-06-28）。
