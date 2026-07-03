---
description: "REQ-7005 P2 零散 IdsJson 字段迁移为边表 — 决策日志"
---

# REQ-7005 Decision Log

## D1：复用 P0 边表模式

- **决策**：完全复用 REQ-7004 的边表 + 双写 + fallback 模式
- **理由**：P0 已验证此模式可行（1122 测试全过），P2 的 4 个字段更简单（每个只有 1 写 1 读），无需新设计
- **日期**：2026-06-30

## D2：StoryPlanIssue 使用 SetNull 而非 Cascade

- **决策**：StoryPlanIssue.issueId 的 FK onDelete 使用 SetNull
- **理由**：ConsistencyFact（issue）可能被清理但 StoryPlan 需保留，删除 issue 只需清空引用
- **日期**：2026-06-30

## D3：导出模块和 Prompt 模板暂不改

- **决策**：novelExport.mappers.ts 的 JSON 透传和 replanWindowDecision.prompts.ts 的 JSON 嵌入保持不变
- **理由**：导出和 prompt 消费的是 JSON 字符串格式，不是结构化 ID 数组；改动不影响功能，反而可能引入格式差异
- **日期**：2026-06-30
