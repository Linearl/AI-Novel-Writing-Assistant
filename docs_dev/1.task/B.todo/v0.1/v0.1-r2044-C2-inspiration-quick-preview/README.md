---
description: "灵感页快速预览 — 输入灵感后 30 秒内看到 3 个方向候选（标题+梗概+500字预览）"
status: requirements_ready
reqId: 2044
version: v0.1
priority: p2
complexity: complex
updated: 2026-07-08
---

# v0.1-r2044 灵感页快速预览

> 来源：产品需求优先级诊断报告（2026-07-08）决策10

## 概述

在创建页（NovelCreate）内部新增"快速预览"功能。用户输入灵感后，AI 在 30 秒内生成 3 个方向候选（标题 + 梗概 + 前 500 字预览），让用户快速"看到"自己的故事。选定方向后可继续写前 3 章，满意后一键转入正式自动导演流程。

## 验收标准

- [ ] 创建页输入灵感后，点击"快速预览"按钮
- [ ] 30 秒内返回 3 个方向候选（标题 + 梗概 + 前 500 字）
- [ ] 用户可选择一个方向，继续生成前 3 章
- [ ] 满意后可一键转入正式自动导演流程
- [ ] 新用户从打开产品到看到第一段文字 < 2 分钟
- [ ] pnpm typecheck 通过
- [ ] pnpm build 通过

## 六件套

| 文件 | 说明 |
|------|------|
| README.md | 本文件 |
| REQ-2044-inspiration-quick-preview.md | 需求文档 |
| tasks.md | 任务清单 |
| design.md | 设计文档 |
| decision_log.md | 决策日志 |
| run_result.json | 执行结果 |
