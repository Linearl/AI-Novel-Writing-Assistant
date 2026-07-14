---
reqId: 7059
title: "Prompt 模板系统"
status: requirements_ready
priority: P2
complexity: C1
estimatedEffort: "4-5天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7059: Prompt 模板系统

## 概述

高级模板引擎（token 引用 `{{context.xxx}}`）、每本小说可自定义 writer prompt、版本化覆盖 + 回滚、编译诊断、安全约束（必需上下文组不可移除）、Slot 系统 official_default 模式。

## 任务包六件套

| 文件 | 说明 |
|------|------|
| [REQ-7059.md](./REQ-7059.md) | 需求文档（工作副本） |
| [REQ-7059-original.md](./REQ-7059-original.md) | 需求文档（冻结副本） |
| [design.md](./design.md) | 技术设计 |
| [tasks.md](./tasks.md) | 任务清单 |
| [decision_log.md](./decision_log.md) | 决策日志 |
| README.md | 本文件 |

## 状态

- 当前阶段：需求就绪
- 复杂度：C1
- 优先级：P2
- 预估工时：4-5天
- 依赖：现有 Prompt Registry 和 Slot 系统

## 上游参考

本功能核心实现可参考上游模板系统：

| 组件 | 上游文件 | 行数 |
|------|----------|------|
| 模板类型定义 | `server/src/prompting/templates/templateTypes.ts` | ~60 |
| 模板编译器 | `server/src/prompting/templates/templateCompiler.ts` | ~600 |
| 官方模板 | `server/src/prompting/templates/officialTemplates.ts` | ~400 |
| 覆盖服务 | `server/src/prompting/templates/PromptTemplateOverrideService.ts` | ~500 |
| 运行时 | `server/src/prompting/templates/templateRuntime.ts` | ~280 |
| Prisma 模型 | 2 个新模型（PromptTemplateOverride, PromptTemplateVersion） | - |
