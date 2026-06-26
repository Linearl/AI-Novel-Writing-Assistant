<!-- Parent: ../../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# server/src/prompting/prompts

## Purpose
具体 prompt 资产 — 按 family(业务域)分子目录。每个文件就是一个 `PromptAsset` 实现,必须在 `server/src/prompting/registry.ts` 注册。

## Subdirectories (families)
| Directory | Family | Purpose |
|-----------|--------|---------|
| `agent/` | Agent | Agent 行为类 prompt |
| `audit/` | Audit | 审计相关 |
| `bookAnalysis/` | BookAnalysis | 整本书分析 |
| `character/` | Character | 角色生成 / 角色相关 |
| `comic/` | Comic | 漫画 |
| `drama/` | Drama | 短剧 |
| `genre/` | Genre | 类型 / 题材 |
| `helper/` | Helper | 工具型 helper |
| `image/` | Image | 图片生成 |
| `novel/` | Novel | 小说生成核心(下含 `chapterEditor/` / `volume/`)(see `novel/AGENTS.md`) |
| `payoff/` | Payoff | 伏笔 / 兑现 |
| `planner/` | Planner | 规划器 |
| `state/` | State | 状态相关 |
| `storyMode/` | StoryMode | 故事模式 |
| `storyWorldSlice/` | StoryWorldSlice | 世界切片 |
| `style/` | Style | 风格提取 / 控制 |
| `world/` | World | 世界观 |
| `writingFormula/` | WritingFormula | 写法引擎 |

## For AI Agents

### Adding a New Prompt
1. 在对应 family 目录新建 `PromptAsset` 实现
2. 在 `server/src/prompting/registry.ts` 注册(显式 `id` / `version` / `taskType` / `mode` / `contextPolicy` / 结构化时 `outputSchema`)
3. 命名与注册流程遵循 `server/src/prompting/README.md`
4. 不要在其他 service 文件里内联新的 prompt

### Migration Path
- 触碰未注册的 prompt 路径时,默认迁移到本目录(参见根 AGENTS.md "Prompt Governance → Migration Default")

## Dependencies

### Internal
- `server/src/prompting/AGENTS.md` — 注册与治理规则
- `server/src/prompting/registry.ts` — 注册表
- `docs/wiki/prompts/` — 设计原理