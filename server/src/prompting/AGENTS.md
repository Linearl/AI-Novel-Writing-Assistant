<!-- Parent: ../../../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# server/src/prompting

## Purpose
**Prompt Registry、PromptAsset、上下文装配、工作流的唯一产品级入口**。任何新的产品级 prompt 必须从这里出。

## Key Files
| File | Description |
|------|-------------|
| `registry.ts` | PromptAsset 注册表(显式声明 id/version/taskType/mode/contextPolicy/outputSchema) |
| `PromptWorkbenchService.ts` | Prompt Workbench 服务(浏览器/编辑体验) |
| `README.md` | 命名与注册工作流(必读) |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `addendums/` | Prompt 追加/补丁 |
| `context/` | 上下文装配(喂什么、怎么排) |
| `core/` | Prompt 核心原语 |
| `materials/` | 喂给 prompt 的素材 |
| `prompts/` | 具体 prompt 实现,按 family 分目录(see `prompts/AGENTS.md`) |
| `slots/` | Prompt slot 管理 |
| `workflows/` | Prompt workflow 定义 |

## For AI Agents

### Prompt Governance (来自根 AGENTS.md,最高优先级)
- `server/src/prompting/` 是新增产品级 prompt 的**唯一入口**
- 新产品级 prompt 必须实现为 `PromptAsset`,放在 `server/src/prompting/prompts/<family>/`
- 必须注册到 `server/src/prompting/registry.ts`,显式 `id` / `version` / `taskType` / `mode` / `contextPolicy` / 结构化时 `outputSchema`
- **不要**在 service 文件中内联 `systemPrompt` / `userPrompt` 然后调 `invokeStructuredLlm`
- **不要**从 service 代码调裸 `getLLM()`(除非属于已批准例外)

### Approved Exceptions
- `server/src/llm/structuredInvoke.ts` 内的 JSON repair
- `server/src/llm/connectivity.ts` 内的连通性探针
- `graphs/*`、`routes/chat.ts`、`services/novel/runtime/*` 等流桥接代码中 phase-two flow adapter

### Migration Default
- 触碰老的未注册 prompt 路径时,默认**迁移到本目录**而不是扩展老的内联实现

### Naming & Registration
- 命名与注册流程遵循 `server/src/prompting/README.md`

## Dependencies

### Internal
- 根 `AGENTS.md` "Prompt Governance" 是最高优先级
- `docs/wiki/prompts/prompt-registry-and-structured-output.md` — 设计原理
- `server/src/llm/structuredInvoke.ts` — 结构化调用实现