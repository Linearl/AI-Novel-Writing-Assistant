<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-08-08 -->

# server/src/modules/novel

## Purpose
小说业务模块 HTTP 入口 + 领域处理器。最大的模块表面,按小说生产各阶段/能力分子目录。

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `http/` | 小说模块 HTTP 路由 |
| `characterConsistency/` | 角色一致性 |
| `characters/` | 小说角色 |
| `checkpoint/` | 检查点 |
| `genre/` | 题材类型 |
| `pace/` | 节奏控制 |
| `planning/` | 小说规划阶段 |
| `production/` | 小说生产阶段 |
| `progress/` | 进度 |
| `quality/` | 质量 |
| `risk/` | 风险管理 |
| `setting/` | 设定 |
| `setup/` | 小说设置阶段 |
| `state/` | 小说状态 |
| `storyMode/` | 故事模式 |
| `titleLibrary/` | 标题库 |

## For AI Agents

### Working In This Directory
- HTTP 层只做参数解析、调用 services/、响应封装
- 业务规则放在 `server/src/services/novel/`
- 跨阶段工作流改动走 feature 分支(根 AGENTS.md)

## Dependencies

### Internal
- `server/src/modules/AGENTS.md`
- `server/src/services/novel/AGENTS.md` — 业务规则归属
