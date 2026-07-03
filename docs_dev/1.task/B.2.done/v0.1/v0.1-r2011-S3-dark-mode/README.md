---
description: "REQ-2011 暗色主题（夜间模式） 任务总线"
---

# REQ-2011 暗色主题（夜间模式）

> 创建日期：2026-06-27
> 目标版本：v0.1
> 状态：⏳ 进行中

---

## 1. 任务概述

### 1.1 需求来源

用户需求：长时间写作需要暗色主题减轻视觉疲劳。系统仅有亮色主题，Tailwind 已配置 `darkMode: "class"` 但未实现。

### 1.2 核心内容

1. 安装 `next-themes` 依赖
2. `index.css` 新增 `.dark` 类 CSS 变量
3. `AppLayout` 挂载 `ThemeProvider`
4. 导航栏新增三态主题切换按钮

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-2011-original.md` | 需求原始冻结副本 | 否 |
| `REQ-2011.md` | 需求工作副本 | 否 |
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

- [x] 生成 REQ-2011.md
- [x] 生成 REQ-2011-original.md
- [x] 生成 design.md
- [x] 生成 tasks.md
- [x] 生成 decision_log.md
- [x] 生成 run_result.json
- [ ] dev 路由推进实现
