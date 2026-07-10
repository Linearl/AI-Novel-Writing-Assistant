---
description: "REQ-7028 Director 事件系统收敛 — 原始冻结副本"
---

# REQ-7028 Director 事件系统收敛（原始冻结副本）

> ⚠️ 本文件为需求创建时的冻结快照，禁止手动编辑。

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-7028 |
| 优先级 | P1 |
| 来源 | 架构诊断报告 2026-07-10 第11条发现 |
| 关联需求 | 无 |

---

## 核心目标

1. 明确 EventBus（跨模块广播）与 Director 投影（内部状态持久化）的职责分工
2. 去重 director state 文件：保留 `director/state/` 子目录，移除根目录旧版本
3. 制定 takeover 9→4 文件收敛计划
4. 建立 Director 内部事件的统一出口（DirectorEventBridge）

## 现状

- Director 子系统：124 文件
- DirectorEventProjectionHelpers.ts：581 行
- EventBus：7 种事件类型
- runtime/：36 文件，takeover 分散在 9 个文件中
- State 文件：根目录 + state/ 子目录两份

---

## 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-10 | 创建 | 冻结副本 |
