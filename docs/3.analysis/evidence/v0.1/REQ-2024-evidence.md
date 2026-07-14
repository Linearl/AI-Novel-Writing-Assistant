---
description: "REQ-2024 需求开发证据"
id: REQ-2024
title: 支持 MiniMax 图像生成 - 证据包
version: 0.1
route: req
created: 2026-06-29
---

# REQ-2024: 需求开发证据

## 1. 执行元数据

| 字段 | 值 |
|------|-----|
| 任务ID | REQ-2024 |
| 路由 | req |
| 状态 | requirements_ready |
| 开始时间 | 2026-06-29T00:00:00.000Z |
| 完成时间 | 2026-06-29T00:00:00.000Z |

## 2. 产物清单

| 产物 | 路径 | 状态 |
|------|------|------|
| requirements.md | `docs_dev/1.task/B.todo/v0.1/v0.1-r2024-medium-minimax-image-generation/README.md` | ✅ |
| design.md | `docs_dev/1.task/B.todo/v0.1/v0.1-r2024-medium-minimax-image-generation/design.md` | ✅ |
| tasks.md | `docs_dev/1.task/B.todo/v0.1/v0.1-r2024-medium-minimax-image-generation/tasks.md` | ✅ |
| decision_log.md | `docs_dev/1.task/B.todo/v0.1/v0.1-r2024-medium-minimax-image-generation/decision_log.md` | ✅ |
| run_result.json | `docs_dev/1.task/B.todo/v0.1/v0.1-r2024-medium-minimax-image-generation/run_result.json` | ✅ |

## 3. 需求分类

| 字段 | 值 |
|------|-----|
| reqType | feature |
| categoryCode | 2 |
| complexity | medium |
| skipClarification | false |
| skipDesign | false |

## 4. 决策记录

### 决策 1: MiniMax API 兼容性策略
- **选择**: 在现有函数中添加分支
- **理由**: 代码复用，改动小

### 决策 2: MiniMax baseURL 处理
- **选择**: 从 APIKey 表读取
- **理由**: 复用现有配置机制

### 决策 3: MiniMax 错误处理
- **选择**: MiniMax 专用错误处理
- **理由**: 给用户更精确的错误提示

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
  "taskId": "REQ-2024"
}
```
