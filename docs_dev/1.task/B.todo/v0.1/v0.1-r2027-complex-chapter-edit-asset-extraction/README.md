---
description: "章节编辑器编辑后资产沉淀 - 编辑修改自动提取反AI规则和风格画像"
id: REQ-2027
title: 章节编辑器编辑后资产沉淀
version: 0.1
status: requirements_ready
priority: p2
complexity: complex
created: 2026-06-30
updated: 2026-06-30
tags:
  - style-engine
  - chapter-editor
  - anti-ai
  - style-extraction
  - asset-sedimentation
related_requirements:
  - REQ-2025
---

# REQ-2027: 章节编辑器编辑后资产沉淀

## 问题背景

章节编辑器支持用户手动编辑 AI 生成的正文，但编辑行为只更新了当前章节内容，没有从用户的修改中沉淀任何可复用资产。用户的修改隐含了两层价值：

1. **反 AI 偏好**：用户改掉的往往是"AI 味道"重的表达，这些修改可以提炼为反 AI 规则，防止后续生成再犯同类问题。
2. **风格偏好**：用户的修改方向体现了对当前风格画像的不满或调整意图，可以 fork 一份新画像，保留用户的偏好修正。

## 目标

在章节编辑器左侧边栏的保存按钮下方新增两个操作按钮，将用户的编辑行为转化为可沉淀的写法资产。

## 六件套

| 文件 | 状态 |
|------|------|
| [REQ-2027.md](REQ-2027.md) | ✅ 需求工作副本 |
| [REQ-2027-original.md](REQ-2027-original.md) | ✅ 需求冻结副本 |
| [design.md](design.md) | ✅ 设计文档 |
| [tasks.md](tasks.md) | ✅ 任务分解 |
| [decision_log.md](decision_log.md) | ✅ 决策日志 |
| [run_result.json](run_result.json) | ✅ 运行结果 |

## 状态

- `status`: requirements_ready
- `created`: 2026-06-30
- `updated`: 2026-06-30
