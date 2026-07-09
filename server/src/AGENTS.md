<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# server/src

## Purpose
服务端 TypeScript 源码根目录。所有业务模块、平台基础设施、LLM 编排、Prompt Registry、routes 等都从这里发出。

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `app.ts` | Express 应用启动入口 |
| `config/` | 环境配置、Provider 配置、路由常量等 |
| `agents/` | Agent 目录(chat/character/genre/rag/knowledge/styleEngine/storyMode/writingFormula/tasks 等)(see `agents/AGENTS.md`) |
| `chains/` | LangChain chain 组合 |
| `creativeHub/` | Creative Hub 后端能力(对话、追问、规划、工具调用、状态卡片) |
| `db/` | Prisma client 初始化、seed、查询工具 |
| `events/` | 事件总线与副作用处理(handlers/sideEffects) |
| `graphs/` | LangGraph 图编排(auto-director 流水线等) |
| `llm/` | LLM 客户端工厂、Provider、流式、structured invoke、连通性、用法追踪(see `llm/AGENTS.md`) |
| `middleware/` | Express 中间件 |
| `modules/` | 模块化业务入口(novel/export/setup/timeline,每个模块自带 `http/`)(see `modules/AGENTS.md`) |
| `platform/` | 平台基础设施(logging 等) |
| `prisma/` | Prisma schema 与迁移(see `prisma/AGENTS.md`) |
| `prompting/` | Prompt Registry、PromptAsset、上下文/工作流定义(see `prompting/AGENTS.md`) |
| `routes/` | Express 路由(正逐步收敛到各模块 `http/` 入口) |
| `runtime/` | Runtime orchestrator、planner、tool registry、trace store(see `runtime/AGENTS.md`) |
| `services/` | 业务服务层(`novel/` 为主,含 director/runtime/production/planning/state/characters 等)(see `services/AGENTS.md`) |
| `types/` | 服务端内部类型 |
| `workers/` | 后台 worker |

## For AI Agents

### Working In This Directory
- **Single source file 阈值**:单个源文件目标 ~600 行;500-700 行可接受;>700 行必须先重构再继续
- **长文件拆分原则**:先列职责,再分业务规则 / 应用编排 / 持久化与外部适配 / HTTP&API 映射
- **不要**为了拆而拆出无主 `helper.ts` / `utils.ts` / `shared.ts`;必须落到 `domain/` / `application/` / `infrastructure/` / `http/` 或已有业务阶段目录
- 目录 `.ts` >12 个 → 先建下级模块目录
- 同前缀(如 `novelDirector*`)文件 >4 → 收敛到 feature 目录
- 拆分后外部模块通过 facade / `index.ts` 消费,不深导入内部文件

### Layer Direction (来自根 AGENTS.md)
- 收敛到顶层:`app/`(启动 + 路由挂载)、`platform/`(db/llm/events/runtime/config 基础设施)、`modules/`(产品能力)
- 业务模块围绕整本完成工作流组织:`setup` / `planning` / `production` / `director` / `characters` / `state` / `export`
- `routes/` → 模块自有 `http/` 入口
- `services/novel/` 根只保留 facade 和稳定共享入口
- `services/novel/director/` 收敛为 `commands` / `runtime` / `state` / `automation` / `projections` / `recovery` / `phases`

### AI-First Rule (来自根 AGENTS.md)
- 这是 AI-native 项目;意图识别/任务分类/规划/路由/工具选择等决策路径必须以 AI 结构化理解为主
- **不要**用关键词匹配、硬编码 regex、手写分支表实现产品核心行为
- AI 失败时,把它当作 AI 能力问题修,不要加 fallback 匹配

## Dependencies

### Internal
- 根 `AGENTS.md` 是最高优先级
- `server/AGENTS.md` — 包级别规则

### External
- LangChain 1.x、LangGraph 1.x、Express 5、Prisma 7、zod 4、helmet/cors/morgan