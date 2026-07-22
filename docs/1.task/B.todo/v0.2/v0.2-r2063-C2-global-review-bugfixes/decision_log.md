---
description: "REQ-2063 决策日志"
reqId: 2063
type: decision_log
status: done
created: 2026-07-19
---

# 决策日志：全局审校问题修复

## D1: 问题编号格式

- 决策：#G + 三位数字（G001, G002...）
- 理由：G 代表 Global，与章节级 AuditIssue 区分；三位数字支持 999 个问题

## D2: 任务中心 lane 类型

- 决策：新增 `global_review` lane，复用 NovelWorkflowTask 机制
- 理由：与 auto_director 模式一致，不引入新的任务追踪机制

## D3: 章节引用存储

- 决策：同时存储 CUID（affectedChapters）和序号（affectedChapterOrders）
- 理由：CUID 用于跳转，序号用于用户可读显示
