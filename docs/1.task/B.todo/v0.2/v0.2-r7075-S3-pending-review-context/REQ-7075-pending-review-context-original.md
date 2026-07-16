---
description: "REQ-7075 待审上下文注入——需求文档"
---

# REQ-7075 待审上下文注入

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 需求编号 | REQ-7075 |
| 优先级 | P3 |
| 版本 | v0.2 |
| 状态 | requirements_ready |
| 来源 | REQ-7069 的 FR-6，上游参考 `PendingReviewContext` 注入结构 |

---

## 1. 背景与问题

章节进入待审（pending review）状态时，审校者（AI 或人）缺乏足够的上下文来判断提案是否合理——缺少前文摘要、角色当前状态、世界设定变更、主题连贯性提示等背景信息。

需要将待审上下文作为额外字段注入章节审核 prompt 构建流程。

## 2. 目标与范围

### 2.1 In Scope

- 在章节审核 prompt 构建时注入待审上下文（前文摘要 + 角色状态 + 世界变更 + 主题连贯性）
- 上下文数据来源：复用 GenerationContextAssembler 已获取的数据

### 2.2 Out of Scope

- 前文摘要生成算法（使用已有的章节摘要数据）
- 角色状态快照系统（使用已有的 latestStateSnapshot）
- 审校打分标准的变更

---

## 3. 需求详情

注入结构（参考上游 `PendingReviewContext`）：

```
待审上下文:
  - previousSummary: 前文章节摘要（已有 chapter summaries）
  - characterStates: 角色当前资源状态（已有 characterResources）
  - worldChanges: 世界设定近期变更（已有 latestStateSnapshot）
  - thematicContinuity: 主题连贯性提示（从 bible.mainPromise 提取）
```

注入位置：章节审核 prompt 构建流程（`chapterAcceptance.prompt` 或等效入口）。

**前置条件**：REQ-7074（资源上下文重构）必须先完成，确保上下文接口清晰后再新增字段。

---

## 4. 验收标准

- [ ] 审校 prompt 构建时包含待审上下文四大字段
- [ ] 上下文注入后不改变现有审校评分行为（除非上下文提示了新问题）
- [ ] 注入字段不存在时不影响 prompt 构建（优雅降级）
- [ ] typecheck 通过

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| 上下文过长导致 prompt 超 token 限制 | 每个字段做长度截断（如摘要 ≤500 字） |
| 角色状态数据不完整时注入空值 | 优雅降级，缺省时显示"暂无数据" |

---

## 6. 关联与边界

- 前置依赖：REQ-7074（资源上下文重构）
- 数据来源：GenerationContextAssembler + latestStateSnapshot + characterResources
- Prompt Governance：新增字段必须通过 `server/src/prompting/registry.ts` 注册

---

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-16 | 创建 | 从 REQ-7069 拆分 |
