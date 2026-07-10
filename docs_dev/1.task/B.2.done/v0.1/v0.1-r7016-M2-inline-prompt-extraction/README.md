---
description: "REQ-7016 内联 Prompt 提取与模板引擎任务总线"
---

# REQ-7016 内联 Prompt 提取与模板引擎

> 创建日期：2026-07-09
> 目标版本：0.1
> 状态：📋 待办

---

## 1. 任务概述

### 1.1 需求来源

内联 Prompt 诊断报告（2026-07-09）。项目中存在 3 处符合提取标准的内联 prompt（纯静态 + 中文>100字/行数>10），同时缺少通用的 prompt 模板引擎，导致后续含变量的 prompt 无法逐步迁移。

### 1.2 核心内容

1. 开发 Prompt 模板引擎（`server/src/data/prompts/` + 加载器 + 渲染器）
2. 提取 3 处符合条件的内联 prompt 为 YAML 文件
3. 改造原调用方，使用模板引擎加载 prompt
4. 为后续含变量 prompt 的迁移提供基础设施

### 1.3 前置条件

- 无外部依赖

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-7016-inline-prompt-extraction.md` | 需求工作副本 | 否 |
| `REQ-7016-inline-prompt-extraction-original.md` | 冻结副本 | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `design.md` | 方案设计 | 否 |
| `decision_log.md` | 决策留痕 | 否 |
| `run_result.json` | 执行快照 | 否 |

---

## 3. 任务状态

| 时间 | 状态 | 说明 |
| ---- | ---- | ---- |
| 2026-07-09 | 🆕 待激活 | 创建任务包 |

---

## 4. 执行清单

- [ ] T1: 开发 Prompt 模板引擎（YAML 加载器 + 变量渲染器）
- [ ] T2: 提取 3 处内联 prompt 为 YAML 文件
- [ ] T3: 改造原调用方接入模板引擎
- [ ] T4: 全量验证（typecheck + 相关测试）
