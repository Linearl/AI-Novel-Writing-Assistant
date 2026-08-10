<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-08 | Updated: 2026-08-08 -->

# server/src/events

## Purpose
事件总线与副作用处理 — 应用内事件发布/订阅,以及事件触发的副作用(handlers / sideEffects)。

## Key Files
| File | Description |
|------|-------------|
| `EventBus.ts` | 事件总线实现 |
| `index.ts` | 事件模块入口 |
| `types.ts` | 事件类型定义 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `handlers/` | 事件处理器 |
| `sideEffects/` | 副作用处理 |

## For AI Agents

### Working In This Directory
- 事件用于解耦模块间通信;新增事件先定义类型再发布/订阅
- 副作用处理器应幂等,失败可重试

## Dependencies

### Internal
- 消费方:`server/src/services/`、`server/src/orchestration/`

### External
- 无(自研事件总线)
