---
description: "REQ-2036 用户反馈系统任务包 README"
status: requirements_ready
priority: p3
created: 2026-07-02
updated: 2026-07-02
---

# REQ-2036: 用户反馈系统

## 基本信息

| 字段 | 值 |
|------|-----|
| 编号 | REQ-2036 |
| 标题 | 用户反馈系统 |
| 类型 | 核心功能开发 (2xxx) |
| 复杂度 | medium |
| 优先级 | p3 |
| 状态 | requirements_ready |
| 目标版本 | v0.1 |
| 创建日期 | 2026-07-02 |

## 概述

为 AI 小说创作助手构建用户反馈系统，允许用户提交问题反馈、截图附件，管理员可查看、分析、归档反馈。

参考实现：`D:\1.workspace\data_platform\02-dev\dev_12\backend\feedback/`

## 核心功能

1. **反馈提交**：用户可提交标题、描述、严重程度、附件
2. **反馈存储**：每条反馈一个独立文件夹（`server/feedback/{userId}_{timestamp}/`）
3. **反馈列表**：管理员可查看所有待处理反馈
4. **反馈详情**：查看反馈内容、附件、上下文
5. **反馈归档**：将已处理反馈移至 `fixed/` 目录
6. **评论系统**：支持对反馈添加评论

## 任务包六件套

- [x] README.md - 本文件
- [x] REQ.md - 需求工作副本
- [x] REQ-original.md - 需求冻结副本
- [x] design.md - 技术设计文档
- [x] tasks.md - 任务拆解
- [x] decision_log.md - 决策日志
- [x] run_result.json - 运行结果

## 相关文档

- 需求来源：用户反馈系统调研
- 参考项目：data_platform/02-dev/dev_12
