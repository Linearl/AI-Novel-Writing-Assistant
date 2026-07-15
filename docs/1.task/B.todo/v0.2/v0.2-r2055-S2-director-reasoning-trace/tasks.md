---
description: "REQ-2055 任务拆解"
update_time: 2026-07-15
---

# 任务拆解 — 导演步骤间推理链路传递

## 阶段零：准备

- [ ] **T0.1** 确认 REQ-2054 material_index 管道就绪
  - 验证：`material_index` context group 可在步骤中正常注入
  - 估时：—

## 阶段一：Schema 扩展

- [ ] **T1.1** 定义 `ReasoningTrace` 共享类型
  - 文件：`shared/types/director.ts`
  - 字段：step, summary, rejectedAlternatives, keyAssumptions
  - 估时：0.5h

- [ ] **T1.2** 改造 `story.macro.plan` 的 output schema，新增 `reasoningTrace`
  - 文件：对应的 prompt schema 文件
  - 估时：0.5h

- [ ] **T1.3** 改造 `book.contract.create` 的 output schema
  - 估时：0.5h

- [ ] **T1.4** 改造 `character.cast.prepare` 的 output schema
  - 估时：0.5h

- [ ] **T1.5** 改造 `volume.strategy.plan` 的 output schema
  - 估时：0.5h

- [ ] **T1.6** 改造 `chapter.draft.write` 的 output schema
  - 估时：0.5h

## 阶段二：Context Group 注入

- [ ] **T2.1** `materialGroups.ts` 新增 `reasoning_trace` 组定义
  - required: false, importance: "medium"
  - 估时：0.5h

- [ ] **T2.2** `NovelPromptMaterialExporter` 新增 `buildReasoningTrace()` 方法
  - 汇合前序步骤的 reasoningTrace 摘要
  - 估时：1h

- [ ] **T2.3** 后续步骤的 contextRequirements 添加 `reasoning_trace` 组
  - 覆盖：book.contract.create 注入 story.macro.plan 的 reasoning，依此类推
  - 估时：1h

## 阶段三：验证

- [ ] **T3.1** `pnpm typecheck` 通过
- [ ] **T3.2** `pnpm test` 现有测试通过
- [ ] **T3.3** 新增测试：reasoningTrace 字段在步骤间的正确传导
- [ ] **T3.4** 提交

## 估时汇总

| 阶段 | 估时 |
|------|------|
| Schema 扩展 | 3h |
| Context Group 注入 | 2.5h |
| 验证 | 1h |
| **合计** | **~6.5h** |
