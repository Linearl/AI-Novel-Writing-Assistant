<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-08 | Updated: 2026-08-08 -->

# server/src/workers

## Purpose
后台 worker — 任务队列与分发执行(director 任务等)。

## Key Files
| File | Description |
|------|-------------|
| `DirectorTaskQueue.ts` | Director 任务队列 |
| `TaskDispatcher.ts` | 任务分发器 |
| `directorWorker.ts` | Director worker 执行体 |

## For AI Agents

### Working In This Directory
- worker 进程独立于 HTTP 主进程;改动后确认队列语义(幂等、重试、失败处理)
- 涉及自动导演链的 worker 行为遵循根 AGENTS.md "Auto-Director 质量门规则"

## Dependencies

### Internal
- `server/src/orchestration/` — 任务执行逻辑
- `server/src/services/task/` — 任务中心服务

### External
- 无(自研队列)
