<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# server/src/runtime

## Purpose
Runtime orchestrator、Planner、Tool Registry、Trace Store、approval policy、catalog。AI agent 与 tool 调用的执行引擎。

## Key Files
| File | Description |
|------|-------------|
| `orchestrator.ts` | Runtime 编排器 |
| `index.ts` | Runtime 入口 |
| `approvalPolicy.ts` | 审批策略 |
| `catalog.ts` | Agent catalog |
| `toolRegistry.ts` | 工具注册表 |
| `traceStore.ts` | Trace 存储(运行时追踪) |
| `types.ts` | Runtime 类型 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `planner/` | Runtime 内嵌 Planner(可能未充分填充) |
| `tools/` | Runtime 内嵌 Tools(可能未充分填充) |

## For AI Agents

### Working In This Directory
- Runtime 与 auto-director / Creative Hub 强相关 — 改动需看 `docs/wiki/workflows/auto-director-runtime.md` 与 `creative-hub-boundary.md`
- 任何工具注册变更先在 `docs/wiki/architecture/` 留 entry
- planner/tools 子目录若为空,先确认是否需要填充,不要凭想当然加新文件

## Dependencies

### Internal
- 根 `AGENTS.md` 是最高优先级
- `docs/wiki/workflows/auto-director-runtime.md`
- `docs/wiki/workflows/creative-hub-boundary.md`