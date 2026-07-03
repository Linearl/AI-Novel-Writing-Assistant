---
description: "REQ-7005 P2 零散 IdsJson 字段迁移为边表任务总线"
---

# REQ-7005 P2 零散 IdsJson 字段迁移为边表

> 创建日期：2026-06-30
> 目标版本：v0.1
> 状态：✅ 已完成
> 父需求：REQ-7004

---

## 1. 任务概述

### 1.1 需求来源

REQ-7004 P0 完成后，剩余 4 个零散 IdsJson 字段需要迁移为独立边表。

### 1.2 核心内容

1. 新增 4 个边表：OpenConflictCharacter、CharacterResourceKnownBy、StoryPlanIssue、StateVersionProposal
2. 7 个写入点加双写（JSON + 边表）
3. 6 个读取点改为边表优先 + JSON fallback
4. 数据迁移脚本

### 1.3 前置条件

- REQ-7004 P0 时间线边表已完成（已就绪）

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-7005-original.md` | 需求原始冻结副本 | 否 |
| `REQ-7005.md` | 需求工作副本 | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `design.md` | 方案设计 | 否 |
| `decision_log.md` | 决策留痕 | 否 |
| `run_result.json` | 执行快照 | 否 |

---

## 3. 任务状态

| 时间 | 状态 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | 📋 激活 | 从 REQ-7004 P2 拆分 |
| 2026-06-30 | ✅ 完成 | v0.1 第四轮开发完成 |

---

## 4. 执行清单

- [ ] T1：新增 4 个 Prisma 边表模型
- [ ] T2：7 个写入点双写
- [ ] T3：6 个读取点适配
- [ ] T4：数据迁移脚本
- [ ] T5：全量验证（typecheck + test + build）
