---
description: "REQ-2033 主题一致性纯数据工具层任务总线"
---

# REQ-2033 主题一致性纯数据工具层 (Theme Consistency Data Tools)

> 创建日期：2026-06-30
> 目标版本：v0.1
> 状态：✅ 已完成

---

## 1. 任务概述

### 1.1 需求来源

REQ-2029 narrative_advisor 后续迭代。主题相关数据散布在 NovelBible.mainPromise、BookContract.readingPromise、VolumePlan.mainPromise、PayoffLedgerItem.status 等 8 个位置，但没有工具将它们聚合展示。本需求提供 3 个纯数据（无 LLM）工具。

### 1.2 核心内容

1. `audit_payoff_health` — 扫描 PayoffLedgerItem，统计 overdue/failed 数量，标记高风险伏笔
2. `audit_volume_theme_coverage` — 检查每卷 mainPromise 是否有对应章节 purpose 覆盖
3. `get_theme_hierarchy` — 聚合 Bible.mainPromise → VolumePlan.mainPromise → ChapterPlan.purpose 层级

### 1.3 前置条件

- 无外部依赖；所有数据已在 Prisma schema 中

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-2033-original.md` | 需求原始冻结副本 | 否 |
| `REQ-2033.md` | 需求工作副本 | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `run_result.json` | 执行快照 | 否 |

---

## 3. 任务状态

| 时间 | 状态 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | 🆕 待激活 | 需求创建 |
| 2026-06-30 | ✅ 完成 | v0.1 第四轮开发完成 |

---

## 4. 执行清单

- [ ] T1: `audit_payoff_health` — 伏笔健康度审计
- [ ] T2: `audit_volume_theme_coverage` — 卷主题覆盖率
- [ ] T3: `get_theme_hierarchy` — 主题层级聚合
- [ ] T4: 工具注册 + 权限 + 验证
