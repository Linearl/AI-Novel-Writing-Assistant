---
description: "REQ-2061 决策日志"
update_time: 2026-07-20
---
# REQ-2061 决策日志

## D1：方案选择 — LLMSelector 增加 nullable value 支持

- **日期**：2026-07-20
- **决策**：LLMSelector 增加 `allowRouteModel` prop，支持"跟随路由配置"选项
- **理由**：
  - 与后端 null 判断语义一致（`provider == null` → 走路由）
  - 不引入额外 sentinel 值
  - 改动集中在 `LLMSelector` 组件，不影响其他使用场景

## D2：temperature 控件独立于 provider/model

- **日期**：2026-07-20
- **决策**：temperature 使用独立的 `showTemperature` prop，不依赖 `showParameters`
- **理由**：创建面板可能只需要 temperature，不需要暴露 maxTokens

## D3：运行中切换模型 — 复用 policy_update 命令

- **日期**：2026-07-20
- **决策**：扩展 `policy_update` 命令，payload 中增加 `llmOverride` 字段
- **理由**：
  - 复用已有的命令基础设施，无需新增命令类型
  - policy_update 本身就是"运行中调整配置"的语义
  - `applyAutoDirectorLlmOverride` 已存在，只需在 executor 中调用
- **备选方案**：新增独立 API 端点（不经过命令队列，但缺少审计追踪）

## D4：高级策略提前到创建时

- **日期**：2026-07-20
- **决策**：创建面板增加"高级策略"折叠区，将 policy mode 等配置提前到创建时
- **理由**：
  - 消除"创建时配一半、跑起来再配另一半"的分散体验
  - 折叠区不干扰新用户，默认折叠
  - 任务中心策略卡片保留作为运行中调整入口
