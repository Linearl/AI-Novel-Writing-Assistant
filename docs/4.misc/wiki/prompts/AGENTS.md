<!-- Parent: ../../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# docs/wiki/prompts

## Purpose
记录 Prompt Registry 规则、structured output schema 约定、JSON repair 边界与生成质量守卫。这是产品级 prompt 治理的"为什么这样设计"的档案。

## Key Files
| File | Description |
|------|-------------|
| `prompt-registry-and-structured-output.md` | Prompt 注册表与结构化输出契约 |
| `novel-generation-quality-guards.md` | 小说生成质量守卫 |

## For AI Agents

### Prompt Governance (来自根 AGENTS.md)
- `server/src/prompting/` 是新增产品级 prompt 的唯一入口
- 新产品级 prompt 必须实现为 `PromptAsset`,放在 `server/src/prompting/prompts/<family>/`
- 必须在 `server/src/prompting/registry.ts` 注册,显式声明 `id`、`version`、`taskType`、`mode`、`contextPolicy`、结构化输出时 `outputSchema`
- 不要在 service 文件里内联 `systemPrompt` / `userPrompt` 后调用 `invokeStructuredLlm`
- 不要从 service 代码调用裸 `getLLM()`(除非属于已批准的例外)

### Approved Exceptions
- `server/src/llm/structuredInvoke.ts` 内的 JSON repair
- `server/src/llm/connectivity.ts` 内的连通性探针
- `graphs/*`、`routes/chat.ts`、`services/novel/runtime/*` 等流桥接代码中暂留的 phase-two flow adapter

### Naming & Registration
- 命名与注册流程遵循 `server/src/prompting/README.md`

## Dependencies

### Internal
- 根 `AGENTS.md` 中"Prompt Governance"为最高优先级
- `server/src/prompting/AGENTS.md` — 实际代码入口