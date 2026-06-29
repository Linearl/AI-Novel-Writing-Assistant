---
description: "REQ-3006 需求开发证据"
id: REQ-3006
title: 修复详情弹窗增强 - 证据包
version: 0.1
route: req
created: 2026-06-28
---

# REQ-3006: 需求开发证据

## 1. 执行元数据

| 字段 | 值 |
|------|-----|
| 任务ID | REQ-3006 |
| 路由 | req |
| 状态 | requirements_ready |
| 开始时间 | 2026-06-28T00:00:00.000Z |
| 完成时间 | 2026-06-28T00:00:00.000Z |

## 2. 产物清单

| 产物 | 路径 | 状态 |
|------|------|------|
| requirements.md | `docs_dev/1.task/B.todo/v0.1/v0.1-r3006-medium-repair-detail-dialog-enhancement/README.md` | ✅ |
| design.md | `docs_dev/1.task/B.todo/v0.1/v0.1-r3006-medium-repair-detail-dialog-enhancement/design.md` | ✅ |
| tasks.md | `docs_dev/1.task/B.todo/v0.1/v0.1-r3006-medium-repair-detail-dialog-enhancement/tasks.md` | ✅ |
| decision_log.md | `docs_dev/1.task/B.todo/v0.1/v0.1-r3006-medium-repair-detail-dialog-enhancement/decision_log.md` | ✅ |
| run_result.json | `docs_dev/1.task/B.todo/v0.1/v0.1-r3006-medium-repair-detail-dialog-enhancement/run_result.json` | ✅ |

## 3. 需求分类

| 字段 | 值 |
|------|-----|
| reqType | feature |
| categoryCode | 3 |
| complexity | medium |
| skipClarification | false |
| skipDesign | false |

## 4. 决策记录

### 决策 1: Token 统计数据源
- **选择**: 复用 task.tokenUsage
- **理由**: 无需新增 API，降低实施成本

### 决策 2: Diff 库选择
- **选择**: react-diff-viewer-continued
- **理由**: 开箱即用，活跃维护

### 决策 3: Token 刷新策略
- **选择**: 轮询（3s）
- **理由**: 实现简单，性能影响小

### 决策 4: Diff 按钮位置
- **选择**: 步骤 6 头部
- **理由**: 位置显眼，符合用户习惯

### 决策 5: 版本 Tab 命名
- **选择**: 版本 N
- **理由**: 简洁明了

## 5. 状态同步

| 轴 | 状态 | 一致性 |
|----|------|--------|
| requirement | approved | ✅ |
| task | requirements_ready | ✅ |

## 6. 交接工单

```json
{
  "from": "req",
  "to": "dev",
  "type": "req_to_dev",
  "status": "ready",
  "taskId": "REQ-3006"
}
```
