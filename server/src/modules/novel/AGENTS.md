<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# server/src/modules/novel

## Purpose
小说业务模块 HTTP 入口 + 领域处理器。最大的模块表面。

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `http/` | 小说模块 HTTP 路由 |
| `setup/` | 小说设置阶段 |
| `planning/` | 小说规划阶段 |
| `production/` | 小说生产阶段 |
| `state/` | 小说状态 |
| `characters/` | 小说角色 |

## For AI Agents

### Working In This Directory
- HTTP 层只做参数解析、调用 services/、响应封装
- 业务规则放在 `server/src/services/novel/`
- 跨阶段工作流改动走 feature 分支(根 AGENTS.md)

## Dependencies

### Internal
- `server/src/modules/AGENTS.md`
- `server/src/services/novel/AGENTS.md` — 业务规则归属