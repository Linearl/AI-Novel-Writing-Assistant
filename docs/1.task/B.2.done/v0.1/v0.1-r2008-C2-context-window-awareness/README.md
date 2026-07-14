---
description: "REQ-2008 模型上下文窗口配置与自动压缩 任务总线"
---

# REQ-2008 模型上下文窗口配置与自动压缩

> 创建日期：2026-06-27
> 目标版本：v0.1
> 状态：⏳ 进行中

---

## 1. 任务概述

### 1.1 需求来源

代码审查发现：系统完全不感知模型上下文窗口大小。`ModelRouteConfig` 只有 `maxTokens`（输出限制），无输入上下文窗口配置。超限时原始 API 错误直接传播，无自动压缩机制。

### 1.2 核心内容

1. `ModelRouteConfig` 新增 `contextWindow` 字段（默认 1M，可取消勾选降级到 256K）
2. 新增上下文压缩服务：使用率超 85% 时自动压缩至 40% 以下
3. 三条路径集成：Prompt Registry、Chat、CreativeHub

### 1.3 前置条件

- Prisma migration 支持
- 现有 `estimateTextTokens()` 和 `summarizeContextBlock()` 可复用
- 模型路由设置页面可扩展

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-2008-original.md` | 需求原始冻结副本 | 否 |
| `REQ-2008.md` | 需求工作副本 | 否 |
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

- [x] 生成 REQ-2008.md
- [x] 生成 REQ-2008-original.md
- [x] 生成 design.md
- [x] 生成 tasks.md
- [x] 生成 decision_log.md
- [x] 生成 run_result.json
- [ ] dev 路由推进实现
