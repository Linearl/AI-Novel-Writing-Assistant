<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# server/src/services

## Purpose
业务服务层。承载产品的领域逻辑(对比 thin routes 与 platform 基础设施)。最大子目录 `novel/` 是整本小说生产系统的核心。

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `novel/` | 整本小说生产的全部业务服务(director/runtime/production/planning/state/characters/worldContext/storyMacro/volume/quality/dynamics 等)(see `novel/AGENTS.md`) |
| `adaptation/` | 改编能力(contracts/source) |
| `audit/` | 审计相关 |
| `bookAnalysis/` | 整本书分析能力 |
| `bootstrap/` | 启动 / 引导 |
| `character/` | 角色基础能力(被 `novel/characters/` 等复用) |
| `comic/` | 漫画业务 |
| `drama/` | 短剧业务(audio/contracts/engine/guidance/production/source/utils/video/visual) |
| `genre/` | 类型 / 题材 |
| `image/` | 图片生成(novelCover) |
| `knowledge/` | 知识库 |
| `payoff/` | 伏笔 / 兑现台账 |
| `planner/` | Planner 服务 |
| `rag/` | RAG 检索增强 |
| `settings/` | 设置(secretStore) |
| `state/` | 通用 state 服务 |
| `storyMode/` | 故事模式管理 |
| `styleEngine/` | 风格引擎 |
| `task/` | 任务中心(adapters/autoDirectorFollowUps) |
| `title/` | 标题相关 |
| `world/` | 世界观 |
| `writingFormula/` | 写法引擎 |

## For AI Agents

### Working In This Directory
- 服务层应该是 **业务规则 + 应用编排** 的归属;HTTP 映射在 `modules/*/http/`,持久化适配在 `platform/`
- 大型服务目录(如 `novel/`)的根只保留 **facade 与稳定共享入口**;具体实现收敛到子模块
- 同前缀文件 >4 → 收敛到 feature 子目录
- 文件 >700 行 → 强制拆分后再继续特性开发

### Domain vs Adapter Boundary
- `services/<domain>/` — 业务规则
- `services/<domain>/http/` 或 `modules/<domain>/http/` — HTTP 入口
- `platform/db`, `platform/llm`, `platform/events`, `platform/runtime`, `platform/config` — 基础设施适配

## Dependencies

### Internal
- 根 `AGENTS.md` 与 `server/src/AGENTS.md` 为权威规范
- `server/src/prompting/` — Prompt 入口(产品级 prompt 必须走这里)