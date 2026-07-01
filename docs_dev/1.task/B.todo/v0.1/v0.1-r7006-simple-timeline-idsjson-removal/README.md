---
description: "REQ-7006 T1.6 移除时间线旧 JSON 字段任务总线"
---

# REQ-7006 T1.6 移除时间线旧 JSON 字段

> 创建日期：2026-06-30
> 目标版本：v0.1
> 状态：📋 待办
> 父需求：REQ-7004
> 前置条件：REQ-7004 P0 完成 + 生产数据已迁移

---

## 1. 任务概述

### 1.1 需求来源

REQ-7004 P0 完成双写阶段后，需要在生产数据迁移完成并验证稳定后，移除旧的 15 个 `*IdsJson` JSON 字段。

### 1.2 核心内容

1. 确认生产环境数据迁移完成（JSON 元素总数 == 边表行数）
2. 确认边表读取路径正常工作（无 JSON fallback 命中）
3. 从 Prisma schema 移除 15 个 IdsJson 字段
4. 从 timeline.repository.ts 移除 JSON fallback 逻辑
5. 生成 Prisma migration

### 1.3 前置条件

- REQ-7004 P0 边表已在生产环境运行
- 生产数据迁移脚本已执行并验证
- 边表读取路径已观察确认正常

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-7006-original.md` | 需求原始冻结副本 | 否 |
| `REQ-7006.md` | 需求工作副本 | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `design.md` | 方案设计 | 否 |
| `decision_log.md` | 决策留痕 | 否 |
| `run_result.json` | 执行快照 | 否 |

---

## 3. 任务状态

| 时间 | 状态 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | 📋 激活 | 从 REQ-7004 T1.6 拆分 |

---

## 4. 执行清单

- [ ] 确认生产数据迁移完成
- [ ] 确认边表读取路径无 JSON fallback 命中
- [ ] 移除 Prisma schema 中 15 个 IdsJson 字段
- [ ] 移除 timeline.repository.ts 中 JSON fallback 逻辑
- [ ] 生成 Prisma migration
- [ ] 全量验证（typecheck + test + build）
