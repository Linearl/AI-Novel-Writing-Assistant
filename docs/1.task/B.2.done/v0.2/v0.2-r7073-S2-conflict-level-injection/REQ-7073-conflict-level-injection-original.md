---
description: "REQ-7073 冲突等级约束注入——需求文档"
---

# REQ-7073 冲突等级约束注入

## 基本信息

| 字段 | 内容 |
| --- | --- |
| 需求编号 | REQ-7073 |
| 优先级 | P2 |
| 版本 | v0.2 |
| 状态 | requirements_ready |
| 来源 | REQ-7069 的 FR-5 后端部分（前端 UI 由 REQ-7063 处理） |

---

## 1. 背景与问题

`conflictLevel`（0-100 的冲突强度值）已存储在 Chapter 模型上，被卷/章节规划 prompt 使用（volumePlanning.prompts.ts、chapterDetail.prompts.ts 等），但运行时章节**写作** prompt（chapterWriter.prompts.ts）没有直接注入——冲突强度仅通过 `chapterMission` 结构间接传递，模型可能忽略。

需要将 `conflictLevel` 作为显式约束注入写作 prompt。

## 2. 目标与范围

### 2.1 In Scope

- 在 `chapterLayeredContextHelpers.ts` 的 `buildChapterWriteContext()` 中新增 `conflictLevel` 字段
- 在 `chapterWriter.prompts.ts` 渲染为显式约束行

### 2.2 Out of Scope

- 冲突曲线前端可视化 UI（由 REQ-7063 处理）
- 冲突等级自动计算/推荐（后续迭代）
- conflictLevel 数据模型的变更（已存在，不改）

---

## 3. 需求详情

1. 修改 `chapterLayeredContextHelpers.ts` 第 276-299 行的 `buildChapterWriteContext()`：已有的 `targetWordCount` 旁边新增从 `input.contextPackage.chapter.conflictLevel` 读取的 `conflictLevel` 字段
2. 修改 `chapterWriter.prompts.ts`：渲染 `"本章冲突强度: {conflictLevel}/100"` 约束行

---

## 4. 验收标准

- [ ] 写作 prompt 渲染输出包含 `conflictLevel` 约束
- [ ] 前端 ChapterExecutionStrategy 的 conflictLevel 值能正确传导到后端生成 prompt
- [ ] 现有 prompt 格式不被破坏
- [ ] typecheck 通过

---

## 5. 风险与约束

| 风险 | 缓解 |
| ---- | ---- |
| 约束行过于强硬导致模型写作僵硬 | 使用描述性语言（"本章冲突强度约 60/100"） |

---

## 6. 关联与边界

- 改动文件：`chapterLayeredContextHelpers.ts`（buildChapterWriteContext）+ `chapterWriter.prompts.ts`
- 与 REQ-7063（Tension Curve 前端 UI）的边界：7063 负责可视化编辑，本包负责值注入 prompt
- 数据来源：Chapter.conflictLevel 字段（已在 Prisma + GenerationContextAssembler 中读写）

---

## 7. 变更记录

| 日期 | 变更 | 说明 |
| ---- | ---- | ---- |
| 2026-07-16 | 创建 | 从 REQ-7069 拆分 |
