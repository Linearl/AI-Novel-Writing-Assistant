---
description: "写法模板导出/导入 — StyleProfile 支持 JSON 导出/导入，为 Marketplace 铺路"
status: requirements_ready
reqId: 2046
version: v0.1
priority: p3
complexity: medium
updated: 2026-07-08
---

# v0.1-r2046 写法模板导出/导入

> 来源：产品需求优先级诊断报告（2026-07-08）决策9

## 概述

StyleProfile 支持 JSON 格式的导出和导入，为后续写法模板 Marketplace 铺路。用户可以导出自己的写法模板分享给他人，也可以导入社区共享的写法模板。

## 验收标准

- [ ] 风格管理页面新增"导出"按钮，导出 StyleProfile 为 JSON 文件
- [ ] 风格管理页面新增"导入"按钮，从 JSON 文件导入 StyleProfile
- [ ] 导入时自动处理冲突（同名覆盖/新建/跳过）
- [ ] 导出的 JSON 包含完整的 StyleProfile 数据（含 anti-AI 规则）
- [ ] pnpm typecheck 通过
- [ ] pnpm build 通过

## 六件套

| 文件 | 说明 |
|------|------|
| README.md | 本文件 |
| REQ-2046-style-profile-export-import.md | 需求文档 |
| tasks.md | 任务清单 |
| design.md | 设计文档 |
| decision_log.md | 决策日志 |
| run_result.json | 执行结果 |
