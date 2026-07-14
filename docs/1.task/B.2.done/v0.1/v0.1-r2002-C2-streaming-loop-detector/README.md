---
description: "REQ-2002 流式生成死循环检测与提前打断 任务总线"
---

# REQ-2002 流式生成死循环检测与提前打断

> 创建日期：2026-06-26
> 目标版本：v0.1
> 状态：⏳ 进行中

---

## 1. 任务概述

### 1.1 需求来源

用户反馈：正文生成（chapter_execution）步骤中，模型偶尔陷入死循环输出重复内容。当前系统只在事后通过 token 预算（单章 80k / 单步 150k）才触发熔断，此时已经浪费了大量 token 成本。需要在流式输出过程中实时检测重复模式，一旦确认死循环立即打断生成。

### 1.2 核心内容

1. 在流式输出管道中插入实时重复检测器（StreamingRepetitionDetector）
2. 检测到连续重复模式时，立即中止 LLM 流，截断已生成内容
3. 与现有熔断器（CircuitBreaker）集成，记录循环打断信号
4. 打断后向用户展示明确的原因说明（而非静默失败）

### 1.3 前置条件

- 流式生成管道（`chapterWritingGraph.ts` → `streamToSSE()`）已稳定
- 熔断器服务（`DirectorCircuitBreakerService`）已存在
- 正文生成 prompt 已包含反重复约束（但仍无法阻止模型行为异常）

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-2002-original.md` | 需求原始冻结副本 | 否 |
| `REQ-2002.md` | 需求工作副本 | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `design.md` | 方案设计 | 否 |
| `decision_log.md` | 决策留痕 | 否 |
| `run_result.json` | 执行快照 | 否 |

---

## 3. 任务状态

| 时间 | 状态 | 说明 |
| ---- | ---- | ---- |
| 2026-06-26 | 🆕 激活 | req 路由创建任务包 |
| 2026-06-26 | ⏳ 进行中 | requirements / design / tasks 生成中 |

---

## 4. 执行清单

- [ ] 生成 requirements.md
- [ ] 生成 design.md
- [ ] 生成 tasks.md
- [ ] dev 路由推进实现
