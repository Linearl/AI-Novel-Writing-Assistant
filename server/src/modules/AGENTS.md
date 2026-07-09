<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# server/src/modules

## Purpose
模块化业务入口 — 按产品域组织,每个模块自带 `http/` 子目录放 Express 路由。这是 `routes/` 收敛的方向。

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `novel/` | 小说业务 HTTP 与领域处理器(see `novel/AGENTS.md`) |
| `export/` | 导出模块(http) |
| `setup/` | 设置模块(包含 `world/` 与 `world/http/`) |
| `timeline/` | 时间线模块 |

## For AI Agents

### Working In This Directory
- 这是 `routes/` 收敛的目标;新路由不要直接加到 `server/src/routes/`
- 跨阶段工作流改动走 feature 分支(根 AGENTS.md "Development Branch Workflow")
- HTTP 层只做参数解析/响应封装/调用 services/,不放业务规则

## Dependencies

### Internal
- 根 `AGENTS.md` 是最高优先级
- `server/src/services/AGENTS.md` — 业务服务层
- `server/src/AGENTS.md` — 层级方向