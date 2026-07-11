---
description: "提取硬编码常量 — REQ-7032 任务包总线"
---

# REQ-7032：提取硬编码常量

| 字段 | 值 |
|------|-----|
| 编号 | REQ-7032 |
| 优先级 | P3 |
| 复杂度 | simple |
| 状态 | done |
| 版本 | v0.1 |
| 创建 | 2026-07-10 |
| 更新 | 2026-07-10 |
| 来源 | 代码审计-full 独占发现复核报告 |

## 概述

修复 5 类硬编码问题：重复常量（8192 重复 9 次、1500ms）、断路器阈值配置化、魔法数字命名、compactText/truncateText 31 处重复定义、busy-wait 锁无超时。

方案全部确定（提取常量→配置化→统一函数）。

## 文件结构

| 文件 | 说明 |
|------|------|
| `REQ-7032-extract-hardcoded-constants.md` | 需求工作副本 |
| `REQ-7032-extract-hardcoded-constants-original.md` | 需求冻结副本 |
| `tasks.md` | 任务拆解 |
| `run_result.json` | 执行快照 |

> 简单任务，省略 design.md 和 decision_log.md。

## 关联

- 复核报告：`docs_dev/3.analysis/diagnosis/01-active/2026-07-01-代码审计-full/复核报告-独有发现.md`
