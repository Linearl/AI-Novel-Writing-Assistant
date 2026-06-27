---
description: "REQ-2006 步骤4每卷章节数手动调整 任务总线"
---

# REQ-2006 步骤4每卷章节数手动调整

> 创建日期：2026-06-27
> 目标版本：v0.1
> 状态：⏳ 进行中

---

## 1. 任务概述

### 1.1 需求来源

用户需求：当前每卷章节数由系统自动分配（均匀或按比例加权），用户无法手动调整单卷章节数。

### 1.2 核心内容

1. `VolumePlan` 新增 `targetChapterCount` 字段
2. `allocateChapterBudgets()` 尊重手动覆盖
3. 步骤4卷卡片中新增章节数输入控件

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-2006-original.md` | 需求原始冻结副本 | 否 |
| `REQ-2006.md` | 需求工作副本 | 否 |
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

- [x] 生成 REQ-2006.md
- [x] 生成 REQ-2006-original.md
- [x] 生成 design.md
- [x] 生成 tasks.md
- [x] 生成 decision_log.md
- [x] 生成 run_result.json
- [ ] dev 路由推进实现
