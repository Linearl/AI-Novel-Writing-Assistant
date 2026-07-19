---
description: "REQ-2059 Token 预算控制系统重构"
update_time: 2026-07-18
---
# REQ-2059 Token 预算控制系统重构

## 概述

修复 token 预算系统的 CJK 估算偏差、统一估算函数、收拢预算配置到单一 YAML 文件、清理孤儿键和硬编码。

## 六件套

| 文件 | 必填 | 用途 |
| --- | --- | --- |
| [README.md](README.md) | ✅ | 任务总线 |
| [REQ-2059-token-budget-overhaul.md](REQ-2059-token-budget-overhaul.md) | ✅ | 需求文档（工作副本） |
| [REQ-2059-token-budget-overhaul-original.md](REQ-2059-token-budget-overhaul-original.md) | ✅ | 原始需求冻结副本 |
| [tasks.md](tasks.md) | ✅ | 任务拆解 |
| [design.md](design.md) | ✅ | 方案设计 |
| [decision_log.md](decision_log.md) | ✅ | 决策留痕 |
| [run_result.json](run_result.json) | ✅ | 执行快照 |

## 关联

- 来源：[2026-07-18-token-budget-diagnosis.md](../../3.analysis/diagnosis/01-active/2026-07-18-token-budget-diagnosis.md)
- 关联：REQ-2058（卷生成预算放宽依赖本任务的统一配置机制）
