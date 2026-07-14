---
description: "REQ-7004 JSON 软引用 FK 缺失修复任务总线"
---

# REQ-7004 JSON 软引用 FK 缺失修复

> 创建日期：2026-06-30
> 目标版本：v0.1
> 状态：✅ 已完成

---

## 1. 任务概述

### 1.1 需求来源

2026-06-30 图数据库能力诊断报告 — 发现 Prisma schema 中 19 个 `*IdsJson` 字段（分布在 7 个模型中）以 JSON 数组存储实体 ID 引用，无 FK 约束、无索引、无级联删除、无双向一致性保证。

### 1.2 核心内容

1. 将时间线领域的 JSON 软引用迁移为独立 Prisma 边表（TimelineEventEdge 等）
2. 将世界设定领域的 JSON Blob 提取为独立关系表
3. 修复双向一致性问题
4. 保持现有 API 接口不变（内部实现替换）

### 1.3 前置条件

- 无外部依赖
- 需执行 `prisma migrate dev` 生成迁移

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-7004-original.md` | 需求原始冻结副本 | 否 |
| `REQ-7004.md` | 需求工作副本 | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `design.md` | 方案设计 | 否 |
| `decision_log.md` | 决策留痕 | 否 |
| `run_result.json` | 执行快照 | 否 |

---

## 3. 任务状态

| 时间 | 状态 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | 📋 激活 | 从图数据库能力诊断报告创建 |
| 2026-06-30 | ✅ 完成 | v0.1 第四轮开发完成 |

---

## 4. 执行清单

- [ ] P0：时间线 JSON 软引用迁移为独立边表
- [ ] P1：World.structureJson 关系提取为独立表
- [ ] P2：OpenConflict / CharacterResource / StoryPlan 的 IdsJson 字段修复
- [ ] 数据迁移脚本（存量 JSON → 新边表）
- [ ] 全量验证（typecheck + test + build）
