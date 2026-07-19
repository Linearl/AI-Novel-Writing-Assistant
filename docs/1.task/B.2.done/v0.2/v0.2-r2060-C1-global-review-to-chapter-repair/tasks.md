---
description: "REQ-2060 全局审校问题驱动章节修复闭环 — 任务清单"
---

# tasks.md — REQ-2060

## 阶段一：数据层扩展

- [x] 1.1 `novelHttpSchemas.ts` repairSchema 新增 `globalReviewIssueIds?: string[]`
- [x] 1.2 `novelCoreSharedTypes.ts` RepairOptions 新增 `globalReviewIssueIds?: string[]`
- [x] 1.3 `novelReviewRoutes.ts` repair 路由透传 `globalReviewIssueIds` 到 stepModuleRunner

## 阶段二：修复运行时注入全局问题

- [x] 2.1 `ChapterRepairStreamRuntime.ts` resolveRepairIssues 新增 GlobalReviewIssue 查询逻辑
- [x] 2.2 新增 `mapGlobalSeverity` / `mapGlobalCategory` 辅助函数
- [x] 2.3 `chapterAuditContext.ts` 修复上下文装配时调用 `fetchGlobalReviewFeedbackForChapter`
- [x] 2.4 `review.prompts.ts` chapterRepairPrompt preferredGroups 新增 `global_review_feedback`

## 阶段三：修复后状态回写

- [x] 3.1 `ChapterRepairStreamRuntime.ts` finalizeRepairResult 增加 GlobalReviewIssue 状态回写
- [x] 3.2 新增 `checkGlobalReviewIssuesAfterChapterRepair` 函数
- [x] 3.3 在章节修复通过（isPass）后挂载检查
- [x] 3.4 在章节审校通过后挂载检查（AuditService.auditChapter）

## 阶段四：UI — 全局审校页面

- [x] 4.1 `GlobalReviewPage.tsx` IssueCard 增加"执行修复"按钮（confirmed 状态）
- [x] 4.2 `GlobalReviewPage.tsx` IssueCard 增加"调整方案"按钮
- [x] 4.3 新增 `FixPlanAdjustDialog` 组件（弹窗编辑 FixPlan + AI 重新生成）
- [x] 4.4 受影响章节 Badge 改为可点击链接（跳转到章节编辑页）
- [x] 4.5 受影响章节 Badge 跳转时携带 `globalReviewIssueIds` URL 参数

## 阶段五：UI — 章节编辑页

- [x] 5.1 `useNovelEditChapterRuntime.ts` 读取 URL 中的 `globalReviewIssueIds` 参数
- [x] 5.2 `startChapterRepair` 调用时传入 `globalReviewIssueIds` 和自动填充的 `userInstruction`

## 阶段六：批量修复

- [x] 6.1 `GlobalReviewPage.tsx` 新增"批量修复"按钮（toolbar 级）
- [x] 6.2 批量修复逻辑：按 primaryFixChapter 分组，按章节顺序串行
- [x] 6.3 每章修复后执行定向验证（仅检查目标全局问题是否解决）
- [x] 6.4 全部章节完成后，已通过的 GlobalReviewIssue 自动标记 fixed

## 阶段七：测试

- [x] 7.1 单元测试：resolveRepairIssues 合并 GlobalReviewIssue 为 ReviewIssue
- [x] 7.2 单元测试：checkGlobalReviewIssuesAfterChapterRepair 在全部章节 approved 时标记 fixed
- [x] 7.3 单元测试：checkGlobalReviewIssuesAfterChapterRepair 在部分章节未 approved 时保持 confirmed
- [x] 7.4 单元测试：修复失败时 GlobalReviewIssue 状态保持 confirmed
- [x] 7.5 集成测试：单个问题修复 → 定向验证 → 标记 fixed 完整流程
- [x] 7.6 集成测试：批量修复 → 多章节串行 → 自动标记 fixed

## 阶段八：收尾

- [x] 8.1 `pnpm typecheck` 通过
- [x] 8.2 `pnpm test` 全部通过
- [x] 8.3 更新 docs/ 相关文档
