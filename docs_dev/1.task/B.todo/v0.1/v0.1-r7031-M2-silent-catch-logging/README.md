---
description: "静默吞错日志化 — REQ-7031 任务包总线"
---

# REQ-7031：静默吞错日志化

| 字段 | 值 |
|------|-----|
| 编号 | REQ-7031 |
| 优先级 | P2 |
| 复杂度 | medium |
| 状态 | requirements_ready |
| 版本 | v0.1 |
| 创建 | 2026-07-10 |
| 更新 | 2026-07-10 |
| 来源 | 代码审计-full 独占发现复核报告 |

## 概述

修复审计复核确认的 14 处 `.catch(() => {})` 静默吞错 + 2 处 ReadStream 资源泄漏 + 3 处 pipe 流错误处理。方案确定：在 catch 中添加结构化日志（logger.warn/logger.error），不改变异常传播行为。

## 文件结构

| 文件 | 说明 |
|------|------|
| `REQ-7031-silent-catch-logging.md` | 需求工作副本 |
| `REQ-7031-silent-catch-logging-original.md` | 需求冻结副本 |
| `tasks.md` | 任务拆解 |
| `run_result.json` | 执行快照 |

> 简单任务，省略 design.md 和 decision_log.md。

## 关联

- 复核报告：`docs_dev/3.analysis/diagnosis/01-active/2026-07-01-代码审计-full/复核报告-独有发现.md`
- 审计对比：`docs_dev/3.analysis/diagnosis/01-active/2026-07-01-代码审计-full/独占发现-对比全量审计.md`
