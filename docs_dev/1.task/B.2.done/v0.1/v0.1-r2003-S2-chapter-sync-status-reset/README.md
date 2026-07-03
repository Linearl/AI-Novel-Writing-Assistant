---
description: "REQ-2003 章节细化同步后状态重置修复 任务总线"
---

# REQ-2003 章节细化同步后状态重置修复

> 创建日期：2026-06-26
> 目标版本：v0.1
> 状态：⏳ 进行中

---

## 1. 任务概述

### 1.1 需求来源

实际使用发现：步骤5（章节细化/结构化大纲工作台）完成后，自动同步到步骤6（章节执行区）时，已细化但尚未生成正文的章节被重置为 `unplanned` 状态，导致步骤6"待写作"队列为空，用户无法直接进入写作。

### 1.2 核心内容

1. 修正 `VolumeChapterSyncService` 中 `preserveWorkflowState` 的判定逻辑
2. 已具备执行合同（taskSheet/sceneCards）的无内容章节，同步后应为 `pending_generation`
3. 新建章节同步时也应根据执行合同设置正确的初始状态

### 1.3 前置条件

- 步骤5章节细化流程已稳定
- 步骤6章节执行队列已可用
- `chapterStatus` 枚举包含 `unplanned` 和 `pending_generation`

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-2003-original.md` | 需求原始冻结副本 | 否 |
| `REQ-2003.md` | 需求工作副本（持续更新） | 否 |
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

- [x] 生成 requirements.md
- [x] 生成 design.md
- [x] 生成 tasks.md
- [ ] dev 路由推进实现
