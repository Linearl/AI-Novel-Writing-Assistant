<!-- Parent: ../../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# docs/wiki/architecture

## Purpose
记录架构设计、模块边界与依赖方向的稳定知识。聚焦"为什么这样切分"和"哪些边界不能跨越",而非具体的实现细节。

## Key Files
| File | Description |
|------|-------------|
| `chapter-identity-and-planning-boundary.md` | 章节身份与规划阶段的边界 |
| `drama-forge-module-boundary.md` | Drama Forge 模块边界 |
| `event-side-effect-boundaries.md` | 事件与副作用边界 |
| `image-generation-providers.md` | 图片生成 Provider 架构 |
| `model-selection.md` | 模型选择策略 |
| `read-path-performance-boundaries.md` | 读路径性能边界 |
| `server-architecture-migration-plan.md` | 服务端架构迁移计划 |
| `world-context-gateway.md` | 世界上下文网关 |
| `world-visualization-assets.md` | 世界可视化资产 |

## For AI Agents

### Writing Conventions
- 写"边界":什么属于本模块,什么不属于;哪些跨层调用被禁止
- 写"决策":为什么选 A 而不选 B
- 写"现状规则":当前生效的硬约束
- 用失败模式 / 相关模块段交叉指代其他 Wiki 条目

### Related Wiki
- `docs/wiki/workflows/` — 工作流契约
- `docs/wiki/prompts/` — Prompt 治理
- `docs/wiki/rag/` — 上下文装配

## Dependencies

### Internal
- 根 `AGENTS.md` 中"Architecture Rules"章节是最高优先级
- 与 `server/src/AGENTS.md` 互相印证