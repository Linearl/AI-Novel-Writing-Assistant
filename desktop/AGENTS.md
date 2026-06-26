<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# desktop

## Purpose
`@ai-novel/desktop` 包:Windows Electron 桌面端运行时与打包。包装 server + client,提供 Setup.exe / portable 安装分发。

## Key Files
| File | Description |
|------|-------------|
| `package.json` | 包定义(`main: dist/main.js`,`version: 0.3.20`) |
| `tsconfig.json` | TS 配置 |
| `electron-builder.config.cjs` | electron-builder 打包配置(NSIS / portable) |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `builder/` | electron-builder 资源(图标等;含生成的 `app-icon-*.png`) |
| `scripts/` | 构建/发布/校验 CJS 脚本(stage-desktop / run-electron-builder / publish-desktop-* / verify-desktop-*) |
| `src/` | TypeScript 源码(main / preload / runtime)(see `src/AGENTS.md`) |
| `src/runtime/` | 桌面端 server、state、updater、logging、paths、dataImport |
| `src/@types/electron/` | Electron 类型补充 |
| `src/@types/electron-updater/` | electron-updater 类型补充(stub) |

## For AI Agents

### Working In This Directory
- 这是发布级 surface — 改动桌面端代码按根 AGENTS.md "Desktop Branch Completion Workflow":
  - `desktop-dev` 已完成态,新桌面工作需开 feature 分支
  - 完成后走 `desktop-dev → beta → main`,**不要**直接到 `main`
- **Desktop Packaging Upload Rules**(根 AGENTS.md):
  - 公共 GitHub Release 上传必须 `desktop/package.json` 的 `version` 为稳定 semver(如 `0.2.3`),无 `desktop-` 前缀、无 `-r1` 后缀
  - Git tag 必须为 `vX.Y.Z` 且与 `desktop/package.json` 完全对齐
  - **不要**用 `desktop-vX.Y.Z-rN` / 分支名 / workflow dispatch on `main` 作为公共 release tag
- 若没有"本地打包"的明确需求,优先触发 GitHub 侧的打包 workflow
- 本地打包仅用于:用户明确要求本地产物 / 打包验证 / 脚本明确要求本地 staging

### Verification Recipes
- `pnpm run verify:desktop-package` — stage + 打包 + 校验
- `pnpm run verify:desktop-package:reuse-stage` — 复用已有 stage
- `pnpm run verify:desktop:installer` — NSIS installer + 校验

## Dependencies

### Internal
- `@ai-novel/server` (workspace) — 桌面端内置
- 根 `AGENTS.md` "Desktop Branch Completion Workflow" + "Desktop Packaging Upload Rules" 最高优先级