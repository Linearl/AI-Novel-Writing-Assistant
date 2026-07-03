---
description: "REQ-2031 角色弧光查询工具（原始冻结副本）"
---

# REQ-2031 角色弧光查询工具 (Character Arc Query Tools)

> 状态：⏳ 进行中（完成后改为 ✅ 完成）

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-2031 |
| 优先级 | P2 |
| 来源 | REQ-2029 narrative_advisor 后续迭代 |
| 关联需求 | REQ-2029、REQ-2032 |

---

## 1. 背景与问题

`characterTools.ts` 只有 base character library 的 2 个工具，无法查询 novel 级角色弧光/时间线/动态/关系演化。数据库中 `Character.arcStart/Midpoint/Climax/End`、`CharacterTimeline`、`CharacterRelationStage`、`CharacterDynamicsService.getOverview()` 等数据对 agent 完全不可见。

---

## 2. 目标与范围

新增 4 个 read-only agent tool：`get_character_arc`、`get_character_dynamics_overview`、`get_character_relation_evolution`、`get_character_states_by_chapter`。复用现有 service 层，不新增 service。

---

## 3. 需求详情

见 REQ-2031.md 第 3 节（4 个工具的输入输出规格）。

---

## 4. 验收标准

- [ ] 4 个工具注册且 category 为 read/inspect
- [ ] Planner 和 Reviewer 可调用
- [ ] 类型检查 + 测试通过

---

## 5. 风险与约束

空值字段允许 null；dynamics overview 限制返回数量上限。

---

## 6. 关联与边界

REQ-2032 依赖本需求数据格式。

---

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | 创建 | 初始版本 |
