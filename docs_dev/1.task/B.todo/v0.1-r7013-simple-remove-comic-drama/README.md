---
description: "移除漫画和短剧模块 — 清理代码库中与核心小说写作无关的跨媒体模块"
status: requirements_ready
reqId: 7013
version: v0.1
priority: p2
complexity: simple
updated: 2026-07-08
---

# v0.1-r7013 移除漫画和短剧模块

> 来源：产品需求优先级诊断报告（2026-07-08）决策5

## 概述

从当前产品中移除漫画（comic）和短剧（drama）模块。这两个模块技术成本极高（图像生成、视频生成、配音合成），与 A+E 用户（网文作者）的核心需求（文字产出）不符，属于 PMF 未验证时的功能蔓延。

## 验收标准

- [ ] server/src/modules/ 下 comic 和 drama 相关模块已移除或禁用
- [ ] client/src/pages/ 下漫画和短剧相关页面已移除或隐藏
- [ ] 路由注册中漫画和短剧相关路由已移除
- [ ] shared/types/ 中漫画和短剧相关类型保留（不破坏其他引用）或安全移除
- [ ] pnpm typecheck 通过
- [ ] pnpm build 通过
- [ ] pnpm test 通过

## 六件套

| 文件 | 说明 |
|------|------|
| README.md | 本文件 |
| REQ-7013-remove-comic-drama.md | 需求文档 |
| tasks.md | 任务清单 |
| design.md | 设计文档 |
| decision_log.md | 决策日志 |
| run_result.json | 执行结果 |
