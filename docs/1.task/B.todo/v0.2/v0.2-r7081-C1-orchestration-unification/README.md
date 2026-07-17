# README — REQ-7081 统一编排层

- **编号**: REQ-7081
- **标题**: 统一编排层 — 四套AI编排系统收敛为统一orchestration/模块
- **优先级**: C1
- **版本**: 0.2
- **状态**: requirements_ready
- **创建日期**: 2026-07-17
- **更新日期**: 2026-07-17

## 概述

项目同时存在四套 AI 编排系统（Agent Orchestrator、Runtime Layer、LangGraph Graphs、Director Pipeline），选择逻辑散落各处、状态不互通。本任务建立 `orchestration/` 顶层目录作为统一编排入口，通过统一 router 分发，建立共享 Execution Context 实现状态互通。

## 四套编排系统现状

| 系统 | 入口 | 文件数 | 职责 |
|------|------|--------|------|
| Agent Orchestrator | `agents/orchestrator.ts` | ~50 | 对话编排、工具调用、意图解析 |
| Runtime Layer | `runtime/` + `services/novel/runtime/` | ~35 | DI、任务分发、运行时上下文 |
| LangGraph Graphs | `graphs/` + `creativeHub/` | ~13 | 声明式图编排 |
| Director Pipeline | `services/novel/director/` | ~101 | 章节生成流水线 |

## 目标架构

```
orchestration/
├── router.ts              ← 统一路由：根据任务类型分发
├── agent/                 ← 原 agents/（对话级编排）
├── pipeline/              ← 原 director/（流水线编排）
├── graph/                 ← 原 graphs/ + creativeHub/（图编排）
└── runtime/               ← 原 services/novel/runtime/（运行时协调）
```

## 前置依赖

- **R7080**（Director系统拆分）需先完成或至少阶段1完成
- Director 是最大的子系统，先拆分再迁移更安全

## 预计工时

20-30h（需大量导入路径更新）

## 六件套

| 文件 | 状态 |
|------|------|
| README.md | ✅ |
| REQ-7081-orchestration-unification.md | ✅ |
| REQ-7081-orchestration-unification-original.md | ✅ |
| design.md | ✅ |
| tasks.md | ✅ |
| decision_log.md | ✅ |
| run_result.json | ✅ |
