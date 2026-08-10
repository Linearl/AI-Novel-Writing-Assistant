<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-08-08 -->

# server/src/modules

## Purpose
模块化业务入口 — 按产品域组织,每个模块自带 `http/` 子目录放 Express 路由。这是 `routes/` 收敛的方向。

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `agent/` | Agent 相关 HTTP 入口 |
| `batch/` | 批量任务入口 |
| `bookAnalysis/` | 整本书分析入口 |
| `characterConsistency/` | 角色一致性入口 |
| `chat/` | Creative Hub 聊天入口 |
| `creativeHub/` | Creative Hub 入口 |
| `export/` | 导出模块 |
| `feedback/` | 用户反馈入口 |
| `images/` | 图片生成入口 |
| `knowledge/` | 知识库入口 |
| `llm/` | LLM 设置/路由入口 |
| `logs/` | 日志中心入口 |
| `novel/` | 小说业务核心入口(http + 领域处理器)(see `novel/AGENTS.md`) |
| `promptWorkbench/` | Prompt Workbench 入口 |
| `settings/` | 设置入口 |
| `setup/` | 设置模块(包含 `world/`) |
| `styleEngine/` | 风格引擎入口 |
| `system/` | 系统级入口 |
| `tasks/` | 任务中心入口 |
| `timeline/` | 时间线模块 |
| `writing/` | 写作相关入口 |

## For AI Agents

### Working In This Directory
- 这是 `routes/` 收敛的目标;新路由不要直接加到 `server/src/routes/`
- 跨阶段工作流改动走 feature 分支(根 AGENTS.md "Development Branch Workflow")
- HTTP 层只做参数解析/响应封装/调用 services/,不放业务规则
- 模块内部结构:主入口 + `http/` 子目录(路由) + 必要的领域处理器

## Dependencies

### Internal
- 根 `AGENTS.md` 是最高优先级
- `server/src/services/AGENTS.md` — 业务服务层
- `server/src/AGENTS.md` — 层级方向
