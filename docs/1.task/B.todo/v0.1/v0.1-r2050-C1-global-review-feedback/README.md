---
description: "REQ-2050 全局审校 + 跨章节问题回灌 任务总线"
---

# REQ-2050 全局审校 + 跨章节问题回灌

> 创建日期：2026-07-12
> 目标版本：v0.1
> 状态：✅ 已完成
> updated: 2026-07-14

---

## 1. 任务概述

### 1.1 需求来源

审校质量分析 — 当前审校只能逐章进行，缺少跨章节视角。需要新增全局审校功能，从全书层面发现章节间一致性、角色弧线连贯性、伏笔呼应等问题，并将跨章节问题回灌到逐章修复流程中。

### 1.2 核心内容

1. 全局审校 prompt（audit.global）：定义跨章节审校的输出格式与审校维度
2. GlobalReviewIssue 数据模型 + API：存储跨章节问题并提供查询接口
3. Scope 选择 + 320K token budget 自动裁剪：用户可选审校范围，系统自动按预算裁剪
4. 跨章节问题回灌到逐章审校 context：全局审输出的 issue 注入逐章审校上下文
5. 手动触发 + 卷完成自动触发：支持手动发起全局审校，每完成一卷自动触发

### 1.3 前置条件

- 逐章审校流程已可用（audit.chapter prompt + 逐章 context builder）
- story_macro 数据结构包含 growthPath 和 characterDynamics
- book_contract 已存在且可读取
- Prisma schema 可正常迁移

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-2050-global-review-feedback-original.md` | 需求原始冻结副本 | 否 |
| `REQ-2050-global-review-feedback.md` | 需求工作副本（持续更新） | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `design.md` | 方案设计 | 否 |
| `decision_log.md` | 决策留痕 | 否 |
| `run_result.json` | 执行快照 | 否 |

---

## 3. 任务状态

| 时间 | 状态 | 说明 |
| ---- | ---- | ---- |
| 2026-07-12 | 🆕 激活 | req 路由创建任务包 |
| 2026-07-14 | ✅ 已完成 | 全部任务完成（含后端API+前端UI） |

---

## 4. 执行清单

- [x] 生成 REQ-2050-global-review-feedback.md（需求工作副本）
- [x] 生成 REQ-2050-global-review-feedback-original.md（需求冻结副本）
- [x] 生成 design.md
- [x] 生成 tasks.md
- [x] 生成 decision_log.md
- [x] 生成 run_result.json
- [x] dev 路由推进实现
