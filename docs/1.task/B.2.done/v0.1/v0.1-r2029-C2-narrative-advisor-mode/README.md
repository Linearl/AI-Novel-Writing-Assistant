---
description: "REQ-2029 Creative Hub 叙事讨论通道任务总线"
---

# REQ-2029 Creative Hub 叙事讨论通道 (narrative_advisor)

> 创建日期：2026-06-30
> 目标版本：v0.1
> 状态：✅ 已完成

---

## 1. 任务概述

### 1.1 需求来源

上游 issue：Creative Hub 缺少宏观创作讨论能力。当前系统所有消息必须先经过意图分类器（30 个预定义意图），缺少分析型意图，导致"第三幕节奏太慢"、"角色动机不自然"等叙事讨论被吞进 `general_chat`，无法携带创作上下文，无法调用只读分析工具。

### 1.2 核心内容

1. 新增 `narrative_advisor` 意图，识别宏观创作讨论类消息
2. 新增对应 workflow definition，组合调用只读分析工具（章节摘要、角色状态、世界观约束、时间线等）
3. 新增 answer composer 分支，将工具结果 + 创作上下文组装为叙事分析 prompt
4. 新增叙事分析 PromptAsset，指导 LLM 生成有深度的创作建议

### 1.3 前置条件

- 无外部依赖，完全在现有 Creative Hub 架构内扩展

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-2029-original.md` | 需求原始冻结副本 | 否 |
| `REQ-2029.md` | 需求工作副本 | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `design.md` | 方案设计 | 否 |
| `decision_log.md` | 决策留痕 | 否 |
| `run_result.json` | 执行快照 | 否 |

---

## 3. 任务状态

| 时间 | 状态 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | 🆕 待激活 | 需求创建 |
| 2026-06-30 | ✅ 完成 | v0.1 第四轮开发完成 |

---

## 4. 执行清单

- [x] T1: 意图定义层 — 新增 `narrative_advisor` 枚举 + prompt + normalize 逻辑
- [x] T2: Workflow 层 — 新建 `narrativeAdvisorWorkflowDefinition.ts`，组合只读工具
- [x] T3: Prompt 层 — 新建 `narrativeAdvisorAnalysisPrompt.ts`，叙事分析 LLM prompt
- [x] T4: Answer Composer — 新增 advisor 分支，组装上下文 + 工具结果 → LLM 分析
- [x] T5: 权限与安全 — `approvalPolicy.ts` 更新，确保只读安全
- [x] T6: 集成验证 — 类型检查 + 意图分类测试 + 端到端对话验证
