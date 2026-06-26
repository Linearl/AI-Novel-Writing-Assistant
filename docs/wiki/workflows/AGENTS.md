<!-- Parent: ../../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# docs/wiki/workflows

## Purpose
记录关键工作流的稳定契约:auto-director 运行时、章节生产链、Creative Hub 边界、短剧/漫画工作流、快照保留、质量债归因等。重点在"何时走哪条路径"和"中断后如何恢复"。

## Key Files
| File | Description |
|------|-------------|
| `auto-director-runtime.md` | Auto-director 运行时核心契约 |
| `auto-director-world-setup.md` | Auto-director 世界准备阶段 |
| `book-analysis-workflow.md` | 整本书分析工作流 |
| `chapter-production-chain.md` | 章节生产链(draft → review → repair → save → retry) |
| `comic-character-asset-pipeline.md` | 漫画角色资产流水线 |
| `comic-panel-production-prompt-governance.md` | 漫画分镜 Prompt 治理 |
| `creative-hub-boundary.md` | Creative Hub 边界与触发条件 |
| `desktop-release-versioning.md` | 桌面版发布与版本规则 |
| `lazy-chapter-planning.md` | 懒加载章节规划 |
| `novel-cover-image-generation.md` | 小说封面图生成 |
| `novel-fact-ledger.md` | 小说事实台账 |
| `novel-snapshot-retention.md` | 快照保留策略 |
| `quality-debt-attribution.md` | 质量债归因(局部 vs 全局) |
| `short-drama-workspace.md` | 短剧工作台 |
| `timeline-constraint-layer.md` | 时间线约束层 |

## For AI Agents

### Workflow Conventions
- 写"阶段转移":上一阶段产出是什么,下一阶段如何接管
- 写"恢复路径":checkpoint 位置、resume 命令、失败后的回退
- 写"质量债边界":哪些是局部债可以继续,哪些是全局阻塞必须停(参见根 AGENTS.md "Auto-Director Quality Gate Rules")

### Quality Debt vs Stop Boundary
- 局部问题(`local_patch_plan` / `continue_with_warning` / `patchable_obligation_gap` / `defer_and_continue`)→ 继续推进 + 记录质量债
- 全局问题(`stop_for_replan` / `replan_required` / unrecoverable 失败)→ 停全局链
- UI 与投影必须保留这种区分(见根 AGENTS.md)

## Dependencies

### Internal
- `docs/wiki/architecture/` — 模块边界
- `docs/wiki/prompts/` — Prompt 治理
- `docs/wiki/rag/` — 上下文装配