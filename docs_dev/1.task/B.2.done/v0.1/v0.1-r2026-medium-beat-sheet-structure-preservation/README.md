---
description: "REQ-2026 节奏板重生成结构保持验证 任务总线"
---

# REQ-2026 节奏板重生成结构保持验证

> 创建日期：2026-06-30
> 目标版本：v0.1
> 状态：📋 待办

---

## 1. 任务概述

### 1.1 需求来源

代码分析发现：REQ-2007 新增的 `referenceExisting` 仅作为低优先级参考上下文注入 prompt，没有硬性结构约束。重新生成节奏板时 LLM 可能产出完全不同的 beat 结构（不同的 beat 数量、不同的章节数分配、不同的 key），导致下游 `resolveFullVolumeResumeState()` 的增量保护失效，已有章节的 purpose/taskSheet/sceneCards 等细化字段面临丢失或错位风险。

### 1.2 核心内容

1. **Prompt 约束层**：当 `referenceExisting=true` 时，在 prompt 中注入结构保持硬性指令
2. **后处理验证层**：LLM 输出后验证新旧 beat 结构一致性（beat 数量、key、章节数）
3. **重试机制**：验证失败时将失败原因注入 guidance 触发重试

### 1.3 前置条件

- REQ-2007 已完成（`referenceExisting` 选项已可用）
- `resolveFullVolumeResumeState()` 增量保护机制已存在

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-2026-original.md` | 需求原始冻结副本 | 否 |
| `REQ-2026.md` | 需求工作副本 | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `design.md` | 方案设计 | 否 |
| `decision_log.md` | 决策留痕 | 否 |
| `run_result.json` | 执行快照 | 否 |

---

## 3. 任务状态

| 时间 | 状态 | 说明 |
| ---- | ---- | ---- |
| 2026-06-30 | 🆕 激活 | req 路由创建任务包 |

---

## 4. 执行清单

- [x] 生成 REQ-2026.md
- [x] 生成 REQ-2026-original.md
- [x] 生成 design.md
- [x] 生成 tasks.md
- [x] 生成 decision_log.md
- [x] 生成 run_result.json
- [ ] dev 路由推进实现
