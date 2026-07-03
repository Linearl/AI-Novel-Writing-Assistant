---
description: "REQ-2012 方案设计"
---

# REQ-2012 方案设计

## 1. 方案概述

在任务中心详情页增加"编辑高级设置"按钮（仅自动导演任务 + 暂停/失败状态可见），点击后弹出模态面板，复用创建时的 `DirectorAutoExecutionPlanFields`（扩展 artifactSyncMode）+ `AutoDirectorApprovalStrategyPanel`。后端新增 `update_execution_settings` 命令类型，在暂停态覆写 `seedPayload` 中的 `autoReview`/`autoRepair`/`artifactSyncMode` 以及审批点配置。

### 1.1 设计目标

1. 最小侵入，最大限度复用现有组件和命令分发机制
2. 修改即时保存，下次 continue 时生效
3. 不改变执行范围（startOrder/endOrder/mode），仅调整审校策略和审批策略

### 1.2 关键决策

1. **决策点 1**：新增 `update_execution_settings` 命令而非扩展 `policy_update` — 原因：policy_update 操作 RuntimePolicySnapshot（运行时策略），而 autoReview/autoRepair/artifactSyncMode 存储于 seedPayload（任务计划层），两者存储位置和生命周期不同，混在一起会导致语义混乱。
2. **决策点 2**：复用创建时的高级设置面板组件（`DirectorAutoExecutionPlanFields` + `AutoDirectorApprovalStrategyPanel`）而非新建 — 原因：减少重复代码，保证创建时和编辑时的 UI 一致性。
3. **决策点 3**：modelTier 选择器放入 `TaskCenterRuntimePolicyCard`（与现有 allowExpensiveReview 相邻）— 原因：modelTier 属于运行时策略层，已有 policy_update 支持，仅需前端暴露。

### 1.3 不在范围

- 执行范围 `startOrder`/`endOrder`/`volumeOrder`/`mode` 的暂停后修改
- 审批点修改的"实时生效"（修改后下次 checkpoint 生效，不触发当前 checkpoint 的撤销或重新评估）

## 2. 实现细节

### 2.1 后端

#### 2.1.1 共享类型新增（shared/types/directorRuntime.ts）

```typescript
// 新增命令类型
export interface DirectorUpdateExecutionSettingsRequest {
  autoReview?: boolean;
  autoRepair?: boolean;
  artifactSyncMode?: "adaptive" | "deferred" | "strict";
  approvalPointCodes?: DirectorAutoApprovalPointCode[];
}
```

#### 2.1.2 HTTP 路由（server/src/services/novel/director/http/novelDirector.ts）

在现有 `commandsSchema` 中增加 `update_execution_settings` 分支：

```typescript
z.discriminatedUnion("commandType", [
  // ... existing ...
  {
    commandType: z.literal("update_execution_settings"),
    payload: z.object({
      autoReview: z.boolean().optional(),
      autoRepair: z.boolean().optional(),
      artifactSyncMode: z.enum(["adaptive", "deferred", "strict"]).optional(),
      approvalPointCodes: z.array(z.string()).optional(),
    }),
  },
])
```

#### 2.1.3 命令解释器（DirectorCommandInterpreter.ts）

`update_execution_settings` 标记为 `isControlOnly: true`（不触发 continue，仅修改配置）。

#### 2.1.4 命令执行器（DirectorCommandExecutor.ts）

新增 case 处理：
```
case "update_execution_settings":
  → 读取 autoReview/autoRepair/artifactSyncMode → 写入 task.seedPayload.autoExecutionPlan
  → 读取 approvalPointCodes → 写入 task.approvalConfig（或对等字段）
  → 记录事件日志
```

#### 2.1.5 命令入队（DirectorCommandService.ts）

新增 `enqueueUpdateExecutionSettings(taskId, payload)` 方法，逻辑与 `enqueuePolicyUpdate` 平行。

### 2.2 前端

#### 2.2.1 组件变更清单

| 文件 | 变更 | 说明 |
|------|------|------|
| `directorAutoExecutionPlan.shared.tsx` | 扩展 `DirectorAutoExecutionDraftState` 增加 `artifactSyncMode`；扩展 UI 增加下拉选择器 | 创建时和暂停后共用 |
| `DirectorAutoExecutionPlanFields` | 复用（无须修改，因为它消费 draft state） | - |
| `TaskCenterRuntimePolicyCard.tsx` | 增加 `modelTier` 下拉选择器（cheap_fast / balanced / high_quality） | 3 档位，默认 balanced |
| **新建** `DirectorAdvancedSettingsDialog.tsx` | 模态面板，包含 autoReview/autoRepair/artifactSyncMode + `AutoDirectorApprovalStrategyPanel` | 入口在任务中心 |
| `TaskCenterPage.tsx` | 详情区增加"编辑高级设置"按钮，条件渲染 | 仅 autoDirector 任务 + 暂停/失败状态 |
| `api/novelDirector.ts` | 新增 `updateDirectorExecutionSettings` API 函数 | 调用 commands 端点 |
| `store/directorRealtimeStore.ts` | 可能需要新增刷新标记 | 设置保存后触发投影刷新 |

#### 2.2.2 状态管理

`DirectorAdvancedSettingsDialog` 使用本地 state 管理草稿：
1. 打开时从 task snapshot 读取当前 autoReview/autoRepair/artifactSyncMode/approvalPointCodes
2. 用户修改草稿
3. 保存时调用 `updateDirectorExecutionSettings` API
4. 成功后关闭面板 + toast 提示 + 触发投影刷新

#### 2.2.3 按钮可见条件

```typescript
const showAdvancedSettingsButton =
  task.type === "auto_director" &&
  (task.status === "checkpoint_reached" || task.status === "failed");
```

### 2.3 基础设施

- 无数据库迁移
- 无新增依赖
- 无配置变更

## 3. 接口定义

### 3.1 新增接口

| 方法 | 路径 | 说明 | 权限 |
| ---- | ---- | ---- | ---- |
| POST | `/api/novels/director/tasks/:taskId/commands` | 现有端点，新增 commandType `update_execution_settings` | 任务所属用户 |

### 3.2 请求/响应示例

请求：
```json
{
  "commandType": "update_execution_settings",
  "payload": {
    "autoReview": false,
    "autoRepair": false,
    "artifactSyncMode": "strict",
    "approvalPointCodes": [
      "candidate_direction_confirmed",
      "volume_strategy_ready",
      "structured_outline_ready"
    ]
  }
}
```

响应（标准 DirectorCommandResult 格式）：
```json
{
  "commandId": "cmd_xxx",
  "status": "accepted"
}
```

## 4. 数据模型

无数据库变更。

seedPayload 覆写逻辑：
```
task.seedPayload.autoExecutionPlan.autoReview ← payload.autoReview (if present)
task.seedPayload.autoExecutionPlan.autoRepair ← payload.autoRepair (if present)
task.seedPayload.autoExecutionPlan.artifactSyncMode ← payload.artifactSyncMode (if present)
task.autoApproval.pointCodes ← payload.approvalPointCodes (if present)
```

## 5. 异常处理

| 错误码 | 场景 | 处理方式 |
| ---- | ---- | -------- |
| 400 | payload 为空（无任何可更新字段） | 返回 "至少提供一个更新字段" |
| 404 | taskId 不存在 | 返回 "任务不存在" |
| 409 | 任务不在暂停/失败状态 | 返回 "仅暂停/失败状态可修改执行设置" |

## 6. 验证策略

1. 构建 shared：`pnpm --filter @ai-novel/shared build`
2. 类型检查：`pnpm typecheck`
3. 单元测试：`pnpm test`
4. 手动验证：
   - 创建自动导演任务 → 暂停 → 编辑高级设置 → continue → 验证新设置生效
   - 创建任务时选择 artifactSyncMode → 确认值传入后端
   - 修改 modelTier → 确认 policy_update 请求包含 modelTier
