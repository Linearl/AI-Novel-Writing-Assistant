---
description: "REQ-2034 主题一致性LLM分析层任务总线"
---

# REQ-2034 主题一致性 LLM 分析层 (Theme Consistency LLM Analysis)

> 创建日期：2026-06-30
> 目标版本：v0.1
> 状态：📋 待办

---

## 1. 任务概述

### 1.1 需求来源

REQ-2029 后续迭代。REQ-2033 提供了纯数据工具（payoff 健康度、卷主题覆盖率、主题层级），但这些只能做结构检查。主题偏移、母题断裂等语义级问题需要 LLM 辅助分析。

### 1.2 核心内容

1. 新增 `analyze_theme_consistency` — LLM 辅助检测主题偏移
2. 新增 `analyze_motif_tracking` — LLM 辅助检查母题持续性
3. 新增叙事分析 PromptAsset，组装主题层级 + 章节摘要 → LLM 分析
4. 工具注册到 toolRegistry

### 1.3 前置条件

- REQ-2033 已完成（`get_theme_hierarchy` 提供主题层级数据）

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-2034-original.md` | 需求原始冻结副本 | 否 |
| `REQ-2034.md` | 需求工作副本 | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `run_result.json` | 执行快照 | 否 |

---

## 3. 任务状态

| 时间 | 状态 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | 🆕 待激活 | 需求创建 |

---

## 4. 执行清单

- [ ] T1: `analyze_theme_consistency` — 主题偏移检测
- [ ] T2: `analyze_motif_tracking` — 母题持续性检查
- [ ] T3: PromptAsset — 主题分析 prompt
- [ ] T4: 工具注册 + 权限 + 验证
