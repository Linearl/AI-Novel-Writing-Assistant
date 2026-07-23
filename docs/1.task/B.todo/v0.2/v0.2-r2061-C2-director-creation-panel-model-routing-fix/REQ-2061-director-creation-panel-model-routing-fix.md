---
description: "REQ-2061 自动导演模型配置统一与运行时切换"
update_time: 2026-07-20
---
# REQ-2061 自动导演模型配置统一与运行时切换

> 状态：🚧 进行中

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-2061 |
| 优先级 | P2 |
| 来源 | 代码分析 — 模型路由机制与 UI 交互不一致；用户反馈 — 运行中无法切换模型 |
| 关联需求 | 无 |

---

## 1. 背景与问题

### 问题 1：创建面板强制指定模型，路由失效

自动导演创建面板中 `LLMSelector` 以默认参数渲染（`showModel=true`），用户必须选 provider + model。即使不主动修改，全局 store 的默认值也会写入 seed payload，导致 `resolveAttemptTarget` 中 `shouldResolveRoutePreference = false`，`/settings/model-routes` 中按 taskType 配置的模型路由**全部失效**。

### 问题 2：temperature 设置缺失

`showParameters` 默认 `false`，temperature 输入框隐藏。创建面板没有 temperature 入口，实际行为是 provider 用全局 store 的值、temperature 回退到路由值，来源不一致。

### 问题 3：模型相关配置三处分散

| 配置项 | 创建面板 | 任务中心策略卡片 | 设置页模型路由 |
|--------|---------|-----------------|---------------|
| provider / model | ✅ LLMSelector | ❌ | ✅ 按 taskType |
| temperature | ❌ 缺失 | ❌ | ✅ 按 taskType |
| modelTier | ❌ | ✅ 下拉 | ❌ |
| policy mode | ❌ | ✅ 下拉 | ❌ |
| allowExpensiveReview | ❌ | ✅ checkbox | ❌ |
| mayOverwriteUserContent | ❌ | ✅ checkbox | ❌ |
| autoRepair | ❌ | ✅ checkbox | ❌ |

用户无法在创建时一次性配好运行时策略（modelTier、policy mode 等），只能创建后再改。

### 问题 4：运行中无法切换模型

任务运行后，无法在不暂停的情况下切换模型。后端 `loadDirectorModuleState` 每个步骤都从 DB 重新读取 seed payload，架构上已支持运行时更新，但缺少 API 和 UI。

---

## 2. 目标与范围

### 2.1 目标

1. 创建面板统一"模型与质量"区块：模型来源（路由/自定义）、modelTier、temperature 集中配置
2. 创建面板增加"高级策略"折叠区：将运行时策略提前到创建时设置
3. 任务中心支持运行中切换模型（无需暂停，下一步骤自动生效）
4. 消除配置分散，形成"创建时一次性配好 → 运行中微调"的心智模型

### 2.2 In Scope

**前端**：
- `LLMSelector` 增加 `allowRouteModel` 和 `showTemperature` prop
- 创建面板"模型与质量"区块合并：模型来源 + modelTier + temperature
- 创建面板"高级策略"折叠区：policy mode、allowExpensiveReview、mayOverwriteUserContent、autoRepair
- 任务中心详情增加"切换模型"入口（运行中可用）
- 修改 `NovelAutoDirectorSetupPanel`、`StageModelRun`（两个版本）

**后端**：
- 新增或复用 API 端点：运行中更新 seed payload 的 provider/model/temperature
- 验证 `applyAutoDirectorLlmOverride` 在运行中调用时，下一步骤正确使用新模型
- 验证 provider/model 为 null 时模型路由正确生效

### 2.3 Out of Scope

- 模型路由设置页（`/settings/model-routes`）的修改
- 任务中心策略卡片删除（保留作为运行中调整的备选入口）
- 重试时的模型覆盖逻辑（后端已支持）

---

## 3. 需求详情

### 3.1 创建面板"模型与质量"区块

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

WHEN 用户选择"跟随路由配置"时，
THE SYSTEM SHALL 不将 provider/model 写入 seed payload，
SO THAT 模型路由按 taskType 分配不同模型。

WHEN 用户选择"自定义"时，
THE SYSTEM SHALL 展开 provider/model 选择器，
SO THAT 用户指定的模型覆盖路由配置。

### 3.2 创建面板"高级策略"折叠区

```
┌───────────────────────────────────────┐
│ ▸ 高级策略                             │
│   ├ 推进方式：[推进到检查点 ▾]          │
│   ├ ☑ 允许更完整审校                    │
│   ├ ☐ 允许改写受保护内容                │
│   └ ☑ 自动修复章节问题                  │
└───────────────────────────────────────┘
```

将 `TaskCenterRuntimePolicyCard` 中的配置项提前到创建面板。创建时写入 seed payload，运行时策略卡片仍可修改。

### 3.3 运行中切换模型

WHEN 任务正在运行时，
THE SYSTEM SHALL 允许用户在任务详情中切换模型配置（指定模型或切回路由模式），
THE SYSTEM SHALL 将新配置写入 seed payload，
SO THAT 下一个执行步骤自动使用新模型，无需暂停任务。

**生效机制**：
- 后端 `loadDirectorModuleState` 每个步骤从 DB 重新读取 seed payload
- `applyAutoDirectorLlmOverride` 更新 seed payload 中的 provider/model/temperature
- 下一步骤读取到更新后的值，自动使用新模型
- 当前正在执行的步骤不受影响

### 3.4 默认行为保持

IF 用户不做任何修改（使用默认值），
THEN THE SYSTEM SHALL 默认选择"跟随路由配置"，与路由机制一致。

---

## 4. 验收标准

1. 创建面板"模型来源"默认"跟随路由配置"，seed payload 中 provider/model 为 null
2. 选择"自定义"后可选具体 provider/model，写入 seed payload
3. 模型路由在"跟随路由配置"时按 taskType 正常分配
4. 创建面板有 temperature 设置入口（跟随路由 / 自定义）
5. 创建面板有"高级策略"折叠区，含 policy mode、allowExpensiveReview 等
6. 任务中心详情有"切换模型"入口，运行中可用
7. 切换模型后，下一个步骤使用新模型，当前步骤不受影响
8. 切换回"路由模式"后，下一步骤按 taskType 路由
9. 不修改任何设置时，行为与修改前完全一致
10. 类型检查通过：`pnpm typecheck`
11. 现有测试通过：`pnpm test`
