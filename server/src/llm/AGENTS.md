<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# server/src/llm

## Purpose
LLM 客户端工厂、Provider 抽象、streaming、structured invoke、连通性探针、用法追踪 — 服务端所有 LLM 调用的基础设施层。

## Key Files
| File | Description |
|------|-------------|
| `factory.ts` | LLM client 工厂 |
| `anthropicClient.ts` | Anthropic client |
| `providers.ts` | Provider 抽象与注册 |
| `modelRouter.ts` | 模型路由(参见 `docs/wiki/architecture/model-selection.md`) |
| `modelCatalog.ts` | 模型目录 |
| `streaming.ts` | 流式调用 |
| `structuredInvoke.ts` | **结构化调用 + JSON repair**(已批准的 prompt 治理例外) |
| `structuredOutput.ts` | 结构化输出 schema 工具 |
| `usageTracking.ts` | 用量追踪 |

## For AI Agents

### Working In This Directory
- 新增 Provider → 走 `providers.ts` 抽象
- 新增结构化调用方式 → 优先复用 `structuredInvoke.ts`(含 JSON repair)
- 这里可以调裸 `getLLM()`(属于根 AGENTS.md 已批准的 prompt 治理例外),但不要在这里加产品级 prompt

### Model Selection
- 模型选择与路由决策参见 `docs/wiki/architecture/model-selection.md` 与 `docs/wiki/workflows/`

## Dependencies

### Internal
- 根 `AGENTS.md` "Prompt Governance" 是最高优先级
- `server/src/prompting/AGENTS.md`
- `docs/wiki/architecture/model-selection.md`