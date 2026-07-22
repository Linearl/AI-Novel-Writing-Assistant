---
description: "REQ-2063 任务清单：全局审校问题修复（5项）"
reqId: 2063
type: tasks
status: done
created: 2026-07-19
---

# 任务清单：全局审校问题修复

## 阶段一：数据层

- [x] **T1** shared/types/novelWorkflow.ts 新增 `"global_review"` lane
- [x] **T2** Prisma schema 新增 issueNumber + affectedChapterOrders + unique 约束
- [x] **T3** GlobalReviewIssue 接口新增 issueNumber/affectedChapterOrders

## 阶段二：后端逻辑

- [x] **T4** GlobalReviewService.persistIssues 分配 issueNumber、解析 ch_N 为 CUID
- [x] **T5** 全局审校/批量修复路由创建 NovelWorkflowTask(lane=global_review)
- [x] **T6** NovelWorkflowTaskAdapter.list 查询扩展包含 global_review
- [x] **T7** 批量修复后端推送 currentItemLabel 进度

## 阶段三：前端

- [x] **T8** GlobalReviewPage IssueCard 显示 #G001 编号 Badge
- [x] **T9** 章节 Badge 用 CUID 跳转 + 显示"第N章"
- [x] **T10** 批量修复进度条 + 当前章节与问题编号

## 阶段四：验证

- [x] **T11** pnpm typecheck 通过
- [x] **T12** pnpm test:client 251/251 通过
- [x] **T13** pnpm build 通过
