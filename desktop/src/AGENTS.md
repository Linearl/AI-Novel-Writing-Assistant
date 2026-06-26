<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# desktop/src

## Purpose
Electron 桌面端 TypeScript 源码 — main 进程、preload、runtime 适配层(server 内嵌、state、updater、logging、paths、dataImport)。

## Key Files
| File | Description |
|------|-------------|
| `main.ts` | Electron 主进程入口 |
| `preload.ts` | Preload 脚本 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `runtime/` | 桌面端运行时适配 — 内嵌 server、state、updater、logging、paths、dataImport |
| `@types/electron/` | Electron 类型补充 |
| `@types/electron-updater/` | electron-updater 类型补充(stub) |

## For AI Agents

### Working In This Directory
- 桌面端代码改动按根 AGENTS.md "Desktop Branch Completion Workflow" 处理
- `runtime/` 是桌面端承担"启动 server + 维护状态 + 检查更新"的关键层
- Electron / electron-updater 类型 stub 暂时极简 — 若后续需要扩展,先看官方类型而不是手写

## Dependencies

### Internal
- `desktop/AGENTS.md`
- 根 `AGENTS.md` "Desktop Branch Completion Workflow" 最高优先级