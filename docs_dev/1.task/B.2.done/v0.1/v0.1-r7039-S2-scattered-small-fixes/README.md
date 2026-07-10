---
description: "REQ-7039 任务包总线 — 散点小修复合集"
---

# REQ-7039：散点小修复合集

| 字段 | 值 |
|------|-----|
| 编号 | REQ-7039 |
| 优先级 | P3 |
| 复杂度 | medium |
| 状态 | requirements_ready |
| 涵盖 | ARCH-005/009/023/024 + STA-025 + PERF-003 + COMPAT-004 + PERF-007 |

## 概述

以下 6 条发现方案已确定，改动小、无架构争议，合并为一个任务包。

| 来源 ID | 标题 | 决策 | 改动量 |
|---------|------|------|--------|
| ARCH-005 | structuredInvoke→novelP0Utils 分层违规 | 将 toText 抽取到 `platform/` | 1-2h |
| ARCH-009 | services/http/ 含 Express 路由 | 搬移到 `routes/novelDirector.ts`，更新 app.ts import | 0.5h |
| ARCH-023 | GET /history 返回空数组 | 内联解释已有 IndexedDB 说明，改为 501 Not Implemented + TODO | 0.5h |
| ARCH-024 | 连接测试用 POST | 改为 `router.get(...)` | 0.25h |
| STA-025 | renew 竞态 setInterval→递归 setTimeout | 3 行改动 | 0.5h |
| PERF-003 | modelRouteConfig 每次查 DB | 启动全量预载 Map，save 时 update | 1h |
| COMPAT-004 | API 无版本管理 | 降 P4，不做修改 | — |
| PERF-007 | CharacterLibrary N+1 | 降 P4，不做修改 | — |

## 文件结构

| 文件 | 说明 |
|------|------|
| `REQ-7039-scattered-small-fixes.md` | 需求 |
| `tasks.md` | 任务拆解 |
| `run_result.json` | 执行快照 |

> 简单合集，省略 design.md 和 decision_log.md。
