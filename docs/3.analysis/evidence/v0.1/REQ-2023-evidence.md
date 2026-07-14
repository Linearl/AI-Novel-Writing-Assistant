---
description: "REQ-2023 需求开发证据"
id: REQ-2023
title: 资源变更风险拒绝意图注入 - 证据包
version: 0.1
route: req
created: 2026-06-28
---

# REQ-2023: 需求开发证据

## 1. 执行元数据

| 字段 | 值 |
|------|-----|
| 任务ID | REQ-2023 |
| 路由 | req |
| 状态 | requirements_ready |
| 开始时间 | 2026-06-28T00:00:00.000Z |
| 完成时间 | 2026-06-28T00:00:00.000Z |

## 2. 产物清单

| 产物 | 路径 | 状态 |
|------|------|------|
| requirements.md | `docs_dev/1.task/B.todo/v0.1/v0.1-r2023-medium-resource-reject-intent-injection/README.md` | ✅ |
| design.md | `docs_dev/1.task/B.todo/v0.1/v0.1-r2023-medium-resource-reject-intent-injection/design.md` | ✅ |
| tasks.md | `docs_dev/1.task/B.todo/v0.1/v0.1-r2023-medium-resource-reject-intent-injection/tasks.md` | ✅ |
| decision_log.md | `docs_dev/1.task/B.todo/v0.1/v0.1-r2023-medium-resource-reject-intent-injection/decision_log.md` | ✅ |
| run_result.json | `docs_dev/1.task/B.todo/v0.1/v0.1-r2023-medium-resource-reject-intent-injection/run_result.json` | ✅ |

## 3. 需求分类

| 字段 | 值 |
|------|-----|
| reqType | feature |
| categoryCode | 2 |
| complexity | medium |
| skipClarification | false |
| skipDesign | false |

## 4. 决策记录

### 决策 1: rejectedIntent 存储方案
- **选择**: 复用 validationNotesJson
- **理由**: 无需数据库迁移，复用现有字段

### 决策 2: 意图输入是否必填
- **选择**: 可选
- **理由**: 降低操作门槛，意图是辅助信息

### 决策 3: 按钮显示策略
- **选择**: 仅高风险显示
- **理由**: 高风险是最需要用户决策的场景

### 决策 4: Prompt 注入位置
- **选择**: 章节修复 prompt
- **理由**: 用户意图主要是指导修复，不是指导新生成

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
  "taskId": "REQ-2023"
}
```
