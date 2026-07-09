---
description: "章节节奏张力 — 质量标准按章节张力分级，AI 自动标记，用户可调整"
status: pass
reqId: 2045
version: v0.1
priority: p2
complexity: complex
updated: 2026-07-08
---

# v0.1-r2045 章节节奏张力

> 来源：产品需求优先级诊断报告（2026-07-08）决策3

## 概述

当前质量体系对每章施加同样的质量标准。读者不能接受整本书都是"白开水"，需要"酸辣粉"和"鸡汤"交替。本任务引入"章节节奏张力"机制，在步骤 4 生成 beatSheet 时 AI 自动为每个章节标记张力等级，质量系统根据张力等级调整审校标准。

## 验收标准

- [ ] beatSheet 生成时自动为每个章节标记张力等级（如：low/medium/high/climax）
- [ ] 章节列表中可查看和手动调整张力等级
- [ ] 质量审校系统根据张力等级调整标准（高潮章节高标准，过渡章节适度放松）
- [ ] 自动导演流程中张力等级自动生效
- [ ] pnpm typecheck 通过
- [ ] pnpm test 通过

## 六件套

| 文件 | 说明 |
|------|------|
| README.md | 本文件 |
| REQ-2045-chapter-rhythm-tension.md | 需求文档 |
| tasks.md | 任务清单 |
| design.md | 设计文档 |
| decision_log.md | 决策日志 |
| run_result.json | 执行结果 |
