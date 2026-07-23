---
description: "REQ-2061 技术设计"
update_time: 2026-07-20
---
# REQ-2061 技术设计

## 现状分析

### 模型解析链路

```text
seed payload { provider, model, temperature }
    ↓
getDirectorLlmOptionsFromSeedPayload() → 提取 provider/model/temperature
    ↓
传入 runStructuredPrompt({ options: { provider, model, temperature } })
    ↓
invokeStructuredLlm → resolveAttemptTarget()
    ↓
shouldResolveRoutePreference = (taskType != null && provider == null && model == null)
    ↓
true → resolveModel(taskType) → 按路由分配
false → 直接用传入的 provider/model
```

### 运行时 seed payload 读取机制

每个步骤执行时，`loadDirectorModuleState` 从 DB 重新读取 seed payload：

```text
loadDirectorModuleState(context)
  → getDirectorFactSummary().getState(context)  // DB 查询
  → state.seedPayload                           // 最新值
  → getDirectorInputFromSeedPayload(seedPayload) // 提取 DirectorConfirmRequest
```

这意味着更新 DB 中的 seed payload 后，**下一个步骤自动使用新配置**。

### 已有基础设施

- `applyAutoDirectorLlmOverride()`：更新 seed payload 中的 provider/model/temperature（当前仅重试时调用）
- `DirectorCommandService.enqueueRetryCommand()`：重试时可传入 llmOverride
- `TaskCenterRuntimePolicyCard`：运行中修改 policy mode / modelTier 等

## 设计方案

### 1. LLMSelector 组件改造

新增 props：
- `allowRouteModel?: boolean`（默认 false）— 显示"使用路由模型"选项
- `showTemperature?: boolean`（默认 false）— 独立显示 temperature 控件

当 `allowRouteModel=true` 时：

- provider 下拉增加"跟随路由配置"选项
- 选择此项时，`onChange` 回调传入 `{ provider: undefined, model: undefined }`
- model 下拉随之隐藏
- 当选择具体 provider 时，展开 model 选择

当 `showTemperature=true` 时：

- 显示 temperature 输入框，独立于 provider/model 选择
- 提供"跟随路由"和"自定义"两个模式

### 2. 创建面板"模型与质量"区块

合并当前分散的模型配置到一个区块：

```
┌───────────────────────────────────────┐
│ 模型与质量                             │
│                                       │
│ 模型来源：[跟随路由配置 ▾]              │
│   ├ 跟随路由配置（默认）                │
│   └ 自定义 → 展开 provider/model 选择   │
│                                       │
│ 模型质量偏好：[均衡 ▾]                  │
│   ├ 经济模式                           │
│   ├ 均衡（默认）                       │
│   └ 高质量                             │
│                                       │
│ temperature：[跟随路由] [自定义: 0.7]   │
└───────────────────────────────────────┘
```

涉及文件：
- `NovelAutoDirectorSetupPanel.tsx`
- `autoDirector/StageModelRun.tsx`
- `autoDirectorCreate/StageModelRun.tsx`

### 3. 创建面板"高级策略"折叠区

将 `TaskCenterRuntimePolicyCard` 中的配置提前到创建时：

```tsx
<details>
  <summary>高级策略</summary>
  <PolicyModeSelect value={policyMode} onChange={setPolicyMode} />
  <Checkbox label="允许更完整审校" ... />
  <Checkbox label="允许改写受保护内容" ... />
  <Checkbox label="自动修复章节问题" ... />
</details>
```

这些值写入 seed payload 的 `directorPolicy` 字段（或通过 `buildWorkflowSeedPayload` 传入）。

### 4. 运行中切换模型 API

复用或扩展 `DirectorCommandService`：

**方案 A：扩展 policy_update 命令**
- 在 `policy_update` 命令的 payload 中增加 `llmOverride` 字段
- 执行时调用 `applyAutoDirectorLlmOverride` 更新 seed payload
- 无需新增命令类型

**方案 B：新增独立 API 端点**
- `PATCH /api/director/tasks/:taskId/model`
- 直接调用 `applyAutoDirectorLlmOverride`
- 不经过命令队列，立即生效

推荐方案 A，复用已有的命令基础设施。

### 5. 任务中心 UI 改造

在任务详情中增加"切换模型"区块：

```
┌───────────────────────────────────────┐
│ 当前模型配置                           │
│ DeepSeek / deepseek-chat              │
│                                       │
│ [切换到路由模式] [切换模型 ▾]           │
└───────────────────────────────────────┘
```

- "切换到路由模式"：清除 seed payload 中的 provider/model → 下一步骤走路由
- "切换模型"：展开 LLMSelector → 选择新模型 → 更新 seed payload

## 影响范围

| 文件 | 修改内容 |
| ---- | -------- |
| `client/src/components/common/LLMSelector.tsx` | 增加 `allowRouteModel`、`showTemperature` prop |
| `client/src/pages/novels/components/NovelAutoDirectorSetupPanel.tsx` | 模型与质量区块 + 高级策略折叠区 |
| `client/src/pages/novels/autoDirector/StageModelRun.tsx` | 同上 |
| `client/src/pages/novels/components/autoDirectorCreate/StageModelRun.tsx` | 同上 |
| `client/src/pages/tasks/TaskCenterPage.tsx` | 切换模型入口 |
| `server/src/orchestration/pipeline/commands/DirectorCommandExecutor.ts` | policy_update 处理 llmOverride |
| `shared/types/novelDirector.ts` | DirectorRuntimePolicyUpdateRequest 增加 llmOverride |

## 后端可行性验证

关键验证点：
1. `loadDirectorModuleState` 每步骤从 DB 读取 → **已确认**（[directorWorkflowStepShared.ts:90-113](server/src/orchestration/pipeline/workflowStepRuntime/directorWorkflowStepShared.ts#L90-L113)）
2. `applyAutoDirectorLlmOverride` 可运行中调用 → **已确认**（[NovelWorkflowApplicationService.ts:381-404](server/src/services/novel/workflow/NovelWorkflowApplicationService.ts#L381-L404)）
3. provider/model 为 null 时路由生效 → **已确认**（[structuredInvoke.ts:127-133](server/src/llm/structuredInvoke.ts#L127-L133)）
