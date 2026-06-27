---
description: "REQ-2010 步骤6右侧边栏折叠 任务总线"
---

# REQ-2010 步骤6右侧边栏折叠

> 创建日期：2026-06-27
> 目标版本：v0.1
> 状态：⏳ 进行中

---

## 1. 任务概述

### 1.1 需求来源

用户体验：低分辨率屏幕（1366px/1440px）上，步骤6右侧边栏固定 332px 压缩正文空间。需要支持折叠以释放正文区域。

### 1.2 核心内容

1. 右侧边栏 Tab 栏最左侧增加折叠按钮（`>` 折叠 / `<` 展开）
2. 折叠后 Grid 列从 332px 缩到 40px，正文区扩展
3. 折叠状态持久化到 localStorage

### 1.3 前置条件

- 仅修改 `ChapterManagementTab.tsx` 一个文件
- 参考 `Sidebar.tsx` 和 `NovelWorkspaceRail.tsx` 的折叠模式

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-2010-original.md` | 需求原始冻结副本 | 否 |
| `REQ-2010.md` | 需求工作副本 | 否 |
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

- [x] 生成 REQ-2010.md
- [x] 生成 REQ-2010-original.md
- [x] 生成 design.md
- [x] 生成 tasks.md
- [x] 生成 decision_log.md
- [x] 生成 run_result.json
- [ ] dev 路由推进实现
