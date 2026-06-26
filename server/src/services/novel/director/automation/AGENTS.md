<!-- Parent: ../../../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# server/src/services/novel/director/automation

## Purpose
Auto-director 的自动执行 runtime — 包括 checkpoint、断路器(circuit breaker)、自动推进等安全关键逻辑。**改动需特别谨慎,会影响全局 auto-director 行为**。

## Key Files
| File | Description |
|------|-------------|
| `novelDirectorAutoExecution.ts` | 自动执行主入口 |
| `novelDirectorAutoExecutionRuntime.ts` | 自动执行 runtime |
| `novelDirectorAutoExecutionCircuitBreakerRuntime.ts` | 断路器 — 失败熔断 |
| `novelDirectorAutoExecutionCheckpointRuntime.ts` | Checkpoint 持久化与恢复 |

## For AI Agents

### Working In This Directory
- **安全关键模块** — 改动前必须读 `docs/wiki/workflows/auto-director-runtime.md` 与 `docs/wiki/debugging/recurring-failure-modes.md`
- 断路器与 checkpoint 的行为直接影响全局链是否能跑通
- 不要随意放宽触发阈值 — 宁可保守也不要误熔断
- 改动完成后强制做一次小范围 dry-run / 单元测试再合并

### Branch Workflow
- 任何本目录的改动都属于"跨阶段工作流" → 必须 feature 分支 → `beta` → `main`
- 单 phase 改动完成后强制 commit

## Dependencies

### Internal
- `server/src/services/novel/director/AGENTS.md`
- `docs/wiki/workflows/auto-director-runtime.md`
- `docs/wiki/debugging/recurring-failure-modes.md`