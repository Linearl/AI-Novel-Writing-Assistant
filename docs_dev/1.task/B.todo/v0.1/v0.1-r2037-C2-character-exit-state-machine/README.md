---
description: "REQ-2037 角色退场状态机 任务总线"
---

# REQ-2037 角色退场状态机

> 创建日期：2026-07-03
> 目标版本：v0.1
> 状态：📋 待开发

---

## 1. 任务概述

### 1.1 需求来源

竞品分析（游蜂写作）— 见 `docs_dev/3.analysis/report/2026-07-03-竞品分析-游蜂写作.md`。

长篇小说中后期角色膨胀是常见痛点：大量完成使命的边缘角色仍留在生成上下文中，导致舞台拥挤、角色穿帮。需要一种状态机机制，区分"退场"与"死亡"，并自动推断角色退场状态。

### 1.2 核心内容

1. Character 模型增加 `exitStatus` 字段（枚举：`active` / `exited` / `dead` / `frozen`）
2. auto-director 执行章节后，通过 LLM 自动推断角色退场/死亡
3. `frozen` 角色不参与正文生成上下文构建
4. 客户端角色管理面板展示退场状态并支持手动标记

### 1.3 前置条件

- Character 模型（`server/src/prisma/schema.prisma`）稳定
- auto-director 章节生成流程稳定
- 角色上下文构建逻辑（`prompting/prompts/novel/chapterLayeredContextBlocks.ts` 等）已建立

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-2037-original.md` | 需求原始冻结副本 | 否 |
| `REQ-2037.md` | 需求工作副本（持续更新） | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `design.md` | 方案设计 | 否 |
| `decision_log.md` | 决策留痕 | 否 |
| `run_result.json` | 执行快照 | 否 |

---

## 3. 任务状态

| 时间 | 状态 | 说明 |
| ---- | ---- | ---- |
| 2026-07-03 | 🆕 激活 | req 路由创建任务包 |

---

## 4. 执行清单

- [ ] 生成 REQ-2037-original.md（冻结副本）
- [ ] 生成 REQ-2037.md（工作副本）
- [ ] 生成 design.md
- [ ] 生成 tasks.md
- [ ] 生成 decision_log.md
- [ ] 生成 run_result.json
- [ ] dev 路由推进实现
