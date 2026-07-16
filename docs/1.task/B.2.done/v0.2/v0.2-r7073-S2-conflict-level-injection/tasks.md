---
reqId: 7073
title: "冲突等级约束注入 — 任务清单"
status: requirements_ready
priority: P2
complexity: S2
estimatedEffort: "0.2天"
version: v0.2
created: 2026-07-16
---

# REQ-7073: 冲突等级约束注入 — 任务清单

## 阶段零：需求就绪

- [x] 需求文档完成
- [x] 任务清单完成

## 阶段一：实现

- [x] T1: 修改 `chapterLayeredContextHelpers.ts` 的 `buildChapterWriteContext()`，新增 `conflictLevel` 字段读取（0.05 天）
- [x] T2: 修改 `chapterWriter.prompts.ts`，渲染 "本章冲突强度: {conflictLevel}/100" 约束行（0.05 天）

## 阶段二：验证

- [ ] T3: 验证前端 conflictLevel 值传导到后端生成 prompt（0.05 天）
- [ ] T4: typecheck 通过（0.05 天）

## 阶段三：收尾

- [ ] T5: 更新 README + run_result 状态
- [ ] T6: 提交

## 完成标准

- [ ] 写作 prompt 渲染输出包含 conflictLevel 约束
- [ ] 现有 prompt 格式不被破坏
- [ ] typecheck 通过
