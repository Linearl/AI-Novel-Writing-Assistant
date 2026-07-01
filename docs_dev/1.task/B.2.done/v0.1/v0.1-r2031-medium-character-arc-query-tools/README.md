---
description: "REQ-2031 角色弧光查询工具任务总线"
---

# REQ-2031 角色弧光查询工具 (Character Arc Query Tools)

> 创建日期：2026-06-30
> 目标版本：v0.1
> 状态：✅ 已完成

---

## 1. 任务概述

### 1.1 需求来源

REQ-2029 narrative_advisor 后续迭代。`characterTools.ts` 目前只有 base character library 的两个工具，无法查询 novel 级角色弧光、时间线、动态、关系演化。数据全部在数据库里但 agent 调不到。

### 1.2 核心内容

1. 新增 `get_character_arc` — 查看某角色的弧光规划 + 事件时间线
2. 新增 `get_character_dynamics_overview` — 全角色动态概览（缺席风险、阵营、关系摘要）
3. 新增 `get_character_relation_evolution` — 某对角色的关系演化时间线
4. 新增 `get_character_states_by_chapter` — 某角色按章节的情绪/目标变化
5. 将新工具注册到 `characterTools.ts` 并在 `toolRegistry.ts` 中暴露

### 1.3 前置条件

- 无外部依赖；`CharacterDynamicsService` 等服务层已就绪

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-2031-original.md` | 需求原始冻结副本 | 否 |
| `REQ-2031.md` | 需求工作副本 | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `design.md` | 方案设计 | 否（medium 可省略，但建议保留） |
| `run_result.json` | 执行快照 | 否 |

---

## 3. 任务状态

| 时间 | 状态 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | 🆕 待激活 | 需求创建 |
| 2026-06-30 | ✅ 完成 | v0.1 第四轮开发完成 |

---

## 4. 执行清单

- [ ] T1: `get_character_arc` — 弧光规划 + 时间线
- [ ] T2: `get_character_dynamics_overview` — 全角色动态概览
- [ ] T3: `get_character_relation_evolution` — 关系演化
- [ ] T4: `get_character_states_by_chapter` — 情绪/目标变化
- [ ] T5: 工具注册 + 权限配置
- [ ] T6: 类型检查 + 测试
