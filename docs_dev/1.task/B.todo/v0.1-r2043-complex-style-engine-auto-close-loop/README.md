---
description: "文笔体系自动闭环 — 编辑后自动提取风格 + 拆书自动转化 StyleProfile"
status: requirements_ready
reqId: 2043
version: v0.1
priority: p2
complexity: complex
updated: 2026-07-08
---

# v0.1-r2043 文笔体系自动闭环

> 来源：产品需求优先级诊断报告（2026-07-08）决策4 + 决策7

## 概述

styleEngine 消费侧（章节生成时注入 StyleProfile）已闭环，但生产侧需要手动操作。本任务补齐两个自动闭环：

- **补丁A**：章节编辑保存后自动触发 ChapterEditDiffService，提取反AI规则和写法偏好
- **补丁B**：拆书（BookAnalysis）完成后自动调用 StyleProfileService.createFromBookAnalysis

## 验收标准

- [ ] 用户编辑章节并保存后，自动触发风格提取（无需手动点击按钮）
- [ ] 拆书完成后自动生成 StyleProfile
- [ ] 生成的 StyleProfile 在下次章节生成时自动注入
- [ ] 不影响现有手动触发的按钮功能
- [ ] pnpm typecheck 通过
- [ ] pnpm test 通过

## 六件套

| 文件 | 说明 |
|------|------|
| README.md | 本文件 |
| REQ-2043-style-engine-auto-close-loop.md | 需求文档 |
| tasks.md | 任务清单 |
| design.md | 设计文档 |
| decision_log.md | 决策日志 |
| run_result.json | 执行结果 |
