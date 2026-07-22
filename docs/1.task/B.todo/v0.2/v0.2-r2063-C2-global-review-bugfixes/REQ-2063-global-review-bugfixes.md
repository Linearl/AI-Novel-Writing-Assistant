---
description: "REQ-2063 需求文档：全局审校问题修复（5项）"
reqId: 2063
type: requirement
status: done
created: 2026-07-19
---

# REQ-2063: 全局审校问题修复（5项）

## 背景

全局审校功能上线后发现5个问题，影响核心可用性。

## 问题列表

| # | 问题 | 修复方案 |
|---|------|---------|
| 1 | 全局审校任务中心不可见 | 创建 NovelWorkflowTask(lane=global_review) |
| 2 | 批量修复任务中心不可见 | 同上，批量修复也创建独立 workflow task |
| 3 | 批量修复无进度 | 前端进度条 + 后端 currentItemLabel |
| 4 | 问题缺少唯一编号 | Prisma 新增 issueNumber，自动分配 #G001 |
| 5 | 章节跳转失败 | ch_N 解析为 CUID，前端用 CUID 跳转 |

## 验收

1. 全局审校/批量修复触发后任务中心实时可见
2. 批量修复显示"正在修复第X/Y章 — 问题 #G001 #G002"
3. 每个问题有唯一编号 #G001 格式
4. 点击章节正确跳转
