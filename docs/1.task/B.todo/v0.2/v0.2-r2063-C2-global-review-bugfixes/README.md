---
description: "REQ-2063: 全局审校问题修复（5项）— 任务中心可见性、进度、编号、跳转"
reqId: 2063
type: requirement
status: done
created: 2026-07-19
updated: 2026-07-19T15:00:00.000Z
---

# REQ-2063: 全局审校问题修复（5项）

## 背景

全局审校功能上线后发现5个问题：
1. 全局审校触发后在任务中心不可见
2. 批量修复在任务中心不可见
3. 批量修复无进度提示
4. 审校问题缺少小说内唯一编号
5. 受影响章节跳转失败（Chapter not found）

## 修复内容

1. **任务中心可见性**：全局审校和批量修复触发时创建 `NovelWorkflowTask(lane=global_review)`，Adapter 查询扩展
2. **批量修复进度**：前端进度条 + 后端 `currentItemLabel` 实时推送
3. **问题编号**：Prisma 新增 `issueNumber Int?` + `@@unique([novelId, issueNumber])`，自动分配 #G001、#G002...
4. **章节跳转**：`persistIssues` 将 LLM 返回的 `ch_N` 解析为实际 CUID，前端用 CUID 跳转

## EARS 验收

1. 全局审校触发后任务中心实时可见
2. 批量修复触发后任务中心实时可见
3. 批量修复显示"正在修复第X/Y章 — 问题 #G001 #G002"
4. 每个全局问题有唯一编号 #G001 格式
5. 点击受影响章节正确跳转到章节编辑页

## 状态

已完成（commit eea4cc2c），本任务包为追溯补建。
