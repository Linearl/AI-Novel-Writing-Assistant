<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# server/src/agents

## Purpose
Agent 目录 — 单文件级 agent 实现(chat / character / genre / rag / knowledge / styleEngine / storyMode / tasks / writingFormula 等)。

## Key Files
| File | Description |
|------|-------------|
| `agentCatalog.ts` | Agent catalog |
| `agentRuns.ts` | Agent 运行记录 |
| `chat.ts` | 对话 agent |
| `character.ts` | 角色 agent |
| `genre.ts` | 类型 agent |
| `rag.ts` | RAG agent |
| `knowledge.ts` | 知识库 agent |
| `storyMode.ts` | 故事模式 agent |
| `styleEngine.ts` | 风格引擎 agent |
| `tasks.ts` | 任务 agent |
| `writingFormula.ts` | 写法引擎 agent |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `planner/` | Planner 子目录 |
| `runtime/` | Agent runtime 子目录 |
| `tools/` | Tools 子目录 |
| `settings/` | Settings 子目录 |

## For AI Agents

### Working In This Directory
- Agent 文件若继续增长,按根 AGENTS.md "Architecture Rules" 收敛到 feature 子目录
- 与 runtime orchestrator 的关系 — 参见 `server/src/runtime/AGENTS.md`
- 新增 agent 类型前先看 `docs/wiki/workflows/creative-hub-boundary.md` — 不要扩展成通用聊天

## Dependencies

### Internal
- 根 `AGENTS.md`
- `server/src/runtime/AGENTS.md`
- `docs/wiki/workflows/creative-hub-boundary.md`