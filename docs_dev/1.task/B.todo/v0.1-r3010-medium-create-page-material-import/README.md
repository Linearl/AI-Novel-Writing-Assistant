---
description: "创建页素材导入 — 支持一次性粘贴大段素材，系统自动拆分到对应字段"
status: requirements_ready
reqId: 3010
version: v0.1
priority: p2
complexity: medium
updated: 2026-07-08
---

# v0.1-r3010 创建页素材导入

> 来源：产品需求优先级诊断报告（2026-07-08）决策6

## 概述

增强创建页（NovelCreate）的素材导入灵活性。当前用户只能在固定表单里逐项填写，本任务支持一次性粘贴大段素材（世界观、角色、大纲等），系统自动拆分到对应字段。

## 验收标准

- [ ] 创建页新增"粘贴素材"入口
- [ ] 用户粘贴大段文本后，AI 自动识别并拆分到对应字段（标题、简介、世界观、角色等）
- [ ] 拆分结果可预览和手动调整
- [ ] 确认后自动填入创建表单
- [ ] pnpm typecheck 通过
- [ ] pnpm build 通过

## 六件套

| 文件 | 说明 |
|------|------|
| README.md | 本文件 |
| REQ-3010-create-page-material-import.md | 需求文档 |
| tasks.md | 任务清单 |
| design.md | 设计文档 |
| decision_log.md | 决策日志 |
| run_result.json | 执行结果 |
