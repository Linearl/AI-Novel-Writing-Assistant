---
description: "REQ-2013 自动导演失败状态重试入口缺失"
---

# REQ-2013 自动导演失败状态重试入口缺失

> 创建日期：2026-06-26
> 目标版本：0.1
> 状态：📋 待办

---

## 1. 任务概述

### 1.1 需求来源

自动导演任务因 Prisma 超时进入 `failed` 状态后，用户在自动导演面板只能看到"查看执行详情"和"从最近进度恢复"两个操作，没有直接的"重试"按钮。用户必须手动打开 TaskDrawer 才能找到重试入口，且"从最近进度恢复"的实际行为是跳转到 TaskDrawer 而非真正恢复，导致用户无法自助恢复任务，被迫通过 CLI 或 API 手动干预。

### 1.2 核心内容

1. **服务端**：`DirectorDashboardViewBuilder` 对 `failed` 模式生成 `retry` 类型的 action
2. **客户端**：`NovelAutoDirectorProgressPanel.resolveDashboardAction()` 处理 `retry` 类型，映射为重试 mutation
3. **交互优化**："从最近进度恢复"应直接触发重试而非仅打开 TaskDrawer

### 1.3 前置条件

- 无外部依赖。基于现有 `POST /api/tasks/:kind/:id/retry` 接口和 `NovelAutoDirectorProgressPanel` 组件修改

---

## 2. 任务包结构

| 文件 | 说明 | 可否省略 |
| ---- | ---- | -------- |
| `README.md` | 本任务总线 | 否 |
| `REQ-2013-original.md` | 需求原始冻结副本 | 否 |
| `REQ-2013.md` | 需求工作副本（持续更新） | 否 |
| `tasks.md` | 任务拆解 | 否 |
| `design.md` | 方案设计 | 否 |
| `decision_log.md` | 决策留痕 | 否 |

---

## 3. 验证清单

- [ ] 自动导演 failed 状态下面板显示"重试"按钮
- [ ] 点击"重试"直接触发 retry mutation（非跳转到 TaskDrawer）
- [ ] "从最近进度恢复"触发 resume 重试而非仅打开详情
- [ ] 重试中按钮显示 loading 状态并禁用
- [ ] 重试成功后面板自动切换到 running 状态
- [ ] 原有 TaskDrawer 中的重试按钮仍然可用
- [ ] 类型检查通过：`pnpm typecheck`
