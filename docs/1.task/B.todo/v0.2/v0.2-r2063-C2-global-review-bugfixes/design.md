---
description: "REQ-2063 设计：全局审校问题修复"
reqId: 2063
type: design
status: done
created: 2026-07-19
---

# 设计：全局审校问题修复

## 任务中心可见性

在 NovelWorkflowTask 表中创建 lane=global_review 的记录，NovelWorkflowTaskAdapter.list() 查询条件扩展为 `{ in: ["auto_director", "global_review"] }`。

## 问题编号

Prisma 新增 `issueNumber Int?` 字段，`@@unique([novelId, issueNumber])` 约束。persistIssues 时查询现有最大编号，自动递增分配。格式 #G001。

## 章节跳转

LLM 返回 ch_N 格式，persistIssues 解析为实际 CUID 存入 affectedChapters。前端用 CUID 构建跳转链接，同时存储 affectedChapterOrders 用于显示"第N章"。
