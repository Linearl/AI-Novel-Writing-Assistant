---
description: "REQ-7007 P1 World.structureJson 关系提取为独立表任务总线"
---

# REQ-7007 P1 World.structureJson 关系提取为独立表

> 创建日期：2026-06-30
> 目标版本：v0.1
> 状态：✅ 已完成
> 父需求：REQ-7004

---

## 1. 任务概述

### 1.1 需求来源

REQ-7004 P0 完成后，World.structureJson 中的 relations 对象（forceRelations / locationControls / locationConnections）需要提取为独立 Prisma 边表。

### 1.2 核心内容

1. 新增 3 个 Prisma 边表：WorldForceRelation、WorldLocationControl、WorldLocationConnection
2. 在 worldStructure 写入 facade 加双写
3. worldVisualization 读取改为边表优先 + JSON fallback
4. 数据迁移脚本（解析 structureJson 中的 relations 对象）

### 1.3 前置条件

- REQ-7004 P0 时间线边表已完成（已就绪）
- 需深入理解 structureJson 的 7 层嵌套结构

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-7007-original.md` | 需求原始冻结副本 | 否 |
| `REQ-7007.md` | 需求工作副本 | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `design.md` | 方案设计 | 否 |
| `decision_log.md` | 决策留痕 | 否 |
| `run_result.json` | 执行快照 | 否 |

---

## 3. 任务状态

| 时间 | 状态 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | 📋 激活 | 从 REQ-7004 P1 拆分 |
| 2026-06-30 | ✅ 完成 | v0.1 第四轮开发完成 |

---

## 4. 执行清单

- [ ] T1：新增 3 个 Prisma 边表模型
- [ ] T2：worldStructure 写入 facade 双写
- [ ] T3：worldVisualization 读取适配
- [ ] T4：数据迁移脚本
- [ ] T5：全量验证（typecheck + test + build）
