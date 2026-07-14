---
description: "REQ-2032 角色弧光可视化任务总线"
---

# REQ-2032 角色弧光可视化 (Character Arc Visualization)

> 创建日期：2026-06-30
> 目标版本：v0.1
> 状态：✅ 已完成

---

## 1. 任务概述

### 1.1 需求来源

REQ-2029 narrative_advisor 后续迭代。REQ-2031 提供了后端查询工具（`get_character_arc`、`get_character_dynamics_overview`、`get_character_relation_evolution`、`get_character_states_by_chapter`），但无前端可视化。用户需要直观地看到角色弧光时间线和角色关系网络。

### 1.2 核心内容

1. 角色弧光时间线图：X 轴为章节序号，展示事件节点 + 情绪变化曲线
2. 角色关系网络图：节点=角色，边=关系强度（trust/intimacy/conflict/dependency 四维）
3. 支持选择查看单个角色的弧光详情

### 1.3 前置条件

- REQ-2031 已完成（后端工具和 API 就绪）

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-2032-original.md` | 需求原始冻结副本 | 否 |
| `REQ-2032.md` | 需求工作副本 | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `design.md` | 方案设计 | 否 |
| `decision_log.md` | 决策留痕 | 否 |
| `run_result.json` | 执行快照 | 否 |

---

## 3. 任务状态

| 时间 | 状态 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | 🆕 待激活 | 需求创建 |
| 2026-06-30 | ✅ 完成 | v0.1 第四轮开发完成 |

---

## 4. 执行清单

- [ ] T1: 后端 API — 角色弧光数据聚合端点
- [ ] T2: 前端时间线图 — CharacterArcTimeline 组件
- [ ] T3: 前端关系网络图 — CharacterRelationNetwork 组件
- [ ] T4: 集成 + 验证
