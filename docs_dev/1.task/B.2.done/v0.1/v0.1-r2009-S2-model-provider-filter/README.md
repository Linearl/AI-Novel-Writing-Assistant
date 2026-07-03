---
description: "REQ-2009 模型路由设置页厂商筛选 任务总线"
---

# REQ-2009 模型路由设置页厂商筛选

> 创建日期：2026-06-27
> 目标版本：v0.1
> 状态：⏳ 进行中

---

## 1. 任务概述

### 1.1 需求来源

用户体验：模型路由设置页厂商下拉框显示全部 11 个内置厂商，未配置的厂商干扰选择。`LLMSelector` 已有 `isRunnableProviderConfig()` 过滤但未在设置页使用。

### 1.2 核心内容

1. `ModelRoutesPage` 应用 `isRunnableProviderConfig()` 过滤
2. 已有路由引用的厂商始终可见（灰色 + "未配置"标签）
3. 无可用厂商时显示空状态提示

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-2009-original.md` | 需求原始冻结副本 | 否 |
| `REQ-2009.md` | 需求工作副本 | 否 |
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

- [x] 生成 REQ-2009.md
- [x] 生成 REQ-2009-original.md
- [x] 生成 design.md
- [x] 生成 tasks.md
- [x] 生成 decision_log.md
- [x] 生成 run_result.json
- [ ] dev 路由推进实现
