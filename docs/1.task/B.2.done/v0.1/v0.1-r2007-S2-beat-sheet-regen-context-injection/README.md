---
description: "REQ-2007 节奏板重新生成时注入历史上下文 任务总线"
---

# REQ-2007 节奏板重新生成时注入历史上下文

> 创建日期：2026-06-27
> 目标版本：v0.1
> 状态：⏳ 进行中

---

## 1. 任务概述

### 1.1 需求来源

代码审查发现：步骤5重新生成节奏板时，AI 对此前的节奏板和章节细化结果完全无感知，从零生成。

### 1.2 核心内容

1. `contextBlocks.ts` 新增 `existing_beat_sheet` 和 `existing_chapter_details` 上下文块
2. 确认对话框新增"参考此前生成结果"勾选项（默认勾选）
3. 勾选时注入参考数据，取消时从零生成

### 1.3 前置条件

- 节奏板生成流程已稳定
- `workspace.beatSheets` 数据结构已定义

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-2007-original.md` | 需求原始冻结副本 | 否 |
| `REQ-2007.md` | 需求工作副本 | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `design.md` | 方案设计 | 否 |
| `decision_log.md` | 决策留痕 | 否 |
| `run_result.json` | 执行快照 | 否 |

---

## 3. 任务状态

| 时间 | 状态 | 说明 |
| ---- | ---- | ---- |
| 2026-06-27 | 🆕 激活 | req 路由创建任务包 |
| 2026-06-27 | ⏳ 进行中 | requirements / design / tasks 生成中 |

---

## 4. 执行清单

- [x] 生成 REQ-2007.md
- [x] 生成 REQ-2007-original.md
- [x] 生成 design.md
- [x] 生成 tasks.md
- [x] 生成 decision_log.md
- [x] 生成 run_result.json
- [ ] dev 路由推进实现
