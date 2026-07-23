---
description: "REQ-2061 自动导演创建面板模型路由与温度设置修复"
update_time: 2026-07-20
---
# REQ-2061 自动导演创建面板模型路由与温度设置修复

> 状态：🚧 进行中

## 需求元信息

| 字段 | 内容 |
| ---- | ---- |
| 需求编号 | REQ-2061 |
| 优先级 | P2 |
| 来源 | 代码分析 — 模型路由机制与 UI 交互不一致 |
| 关联需求 | 无 |

---

## 1. 背景与问题

当前 AI 自动导演创建面板中，`LLMSelector` 组件以默认参数渲染（`showModel=true, showParameters=false`），导致两个设计缺陷：

**问题 1：没有"使用路由模型"选项**

用户在创建面板中必须选择一个具体的 provider + model，选完后写入 seed payload。由于 `structuredInvoke.ts` 中 `resolveAttemptTarget` 的逻辑——当 `provider` 或 `model` 不为 null 时，`shouldResolveRoutePreference = false`，模型路由被完全跳过。

这意味着：用户即使只是使用全局 store 的默认值（不主动切换模型），seed payload 中也会写入具体的 provider/model，导致 `/settings/model-routes` 中按 taskType 配置的不同模型（planner/writer/review/repair 等）全部失效。

**问题 2：没有 temperature 设置入口**

`showParameters` 默认 `false`，temperature 输入框完全隐藏。用户无法在创建面板中设置统一的 temperature。

**叠加效应**：由于 temperature 始终为 `undefined`，在 `factory.ts:229` 的逻辑中会回退到路由表中对应 taskType 的 temperature（planner=0.3、writer=0.8、review=0.2 等）。这造成了一个不一致的局面：model 用的是全局 store 的值（或用户手动选的值），temperature 用的是路由里的值，两者来源不同，用户难以理解实际行为。

---

## 2. 目标与范围

### 2.1 目标

1. 在自动导演创建面板中提供"使用路由模型"选项，让用户可以选择不指定具体模型，让系统按模型路由配置自动分配
2. 在创建面板中暴露 temperature 设置入口，让用户可以在创建任务时统一设置 temperature
3. 保持与现有模型路由机制的一致性，不破坏已有功能

### 2.2 In Scope

**前端**：
- 修改 `LLMSelector` 组件，增加"使用路由模型"/"跟随路由配置"选项
- 修改 `NovelAutoDirectorSetupPanel`、`StageModelRun`（两个版本）中的 `LLMSelector` 使用方式
- 当选择"使用路由模型"时，provider/model 不写入 seed payload（或写入 null）
- 增加 temperature 设置入口（`showParameters` 或独立控件）

**后端**：
- 验证 seed payload 中 provider/model 为 null 时，模型路由正确生效
- 无需新增 API，现有 `resolveModel` 逻辑已支持

### 2.3 Out of Scope

- 模型路由设置页（`/settings/model-routes`）的修改
- 任务中心运行时策略卡片的修改（`TaskCenterRuntimePolicyCard` 已有 modelTier 设置）
- 重试时的模型覆盖逻辑（后端已支持，UI 暴露属于另一个需求）

---

## 3. 需求详情

### 3.1 "使用路由模型"选项

WHEN 用户在自动导演创建面板中选择"使用路由模型"（或"跟随路由配置"）时，
THE SYSTEM SHALL 不将 provider/model 写入 seed payload，或写入 null/undefined，
SO THAT 后端 `resolveAttemptTarget` 中 `shouldResolveRoutePreference` 为 true，模型路由按 taskType 正常生效。

### 3.2 temperature 设置入口

WHEN 用户在自动导演创建面板中展开高级设置或模型设置区域时，
THE SYSTEM SHALL 显示 temperature 输入控件，
SO THAT 用户可以在创建任务时设置统一的 temperature 值。

### 3.3 默认行为保持

IF 用户不做任何修改（使用默认值），
THEN THE SYSTEM SHALL 保持当前行为：使用全局 store 的 provider/model，temperature 由路由决定。

---

## 4. 验收标准

1. 自动导演创建面板中存在"使用路由模型"选项
2. 选择"使用路由模型"后，创建的任务 seed payload 中 provider/model 为 null 或未设置
3. 任务执行时，模型路由按 taskType 正常分配不同模型
4. 创建面板中有 temperature 设置入口
5. 设置 temperature 后，该值在所有 taskType 的 LLM 调用中生效
6. 不修改任何设置时，行为与修改前完全一致
7. 类型检查通过：`pnpm typecheck`
8. 现有测试通过：`pnpm test`
