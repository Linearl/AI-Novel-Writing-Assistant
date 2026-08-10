<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-08-08 -->

# server/src/runtime

## Purpose
轻量运行时辅助 — 应用路径常量与内存遥测。历史上在此的 Runtime orchestrator / Planner / Tool Registry / Trace Store 已收敛到 `server/src/orchestration/agent/`(见 `orchestration/AGENTS.md`)。

## Key Files
| File | Description |
|------|-------------|
| `appPaths.ts` | 应用路径常量 |
| `memoryTelemetry.ts` | 内存遥测 |

## For AI Agents

### Working In This Directory
- 本目录只保留无依赖的轻量辅助;任何编排/工具注册/运行逻辑放到 `server/src/orchestration/`
- 新增运行时能力先确认归属:orchestration(编排) vs 本目录(纯辅助)

## Dependencies

### Internal
- `server/src/orchestration/` — 编排层(原 runtime orchestrator 的归属)
- 根 `AGENTS.md` 是最高优先级

### External
- 无
