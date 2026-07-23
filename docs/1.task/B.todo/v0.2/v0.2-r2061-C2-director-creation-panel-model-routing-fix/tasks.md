---
description: "REQ-2061 任务分解"
update_time: 2026-07-20
---
# REQ-2061 任务分解

## 阶段零：前置准备

- [ ] 阅读 `LLMSelector` 组件完整实现
- [ ] 阅读 `resolveAttemptTarget` 和 `resolveLLMClientOptions` 模型解析逻辑
- [ ] 确认 seed payload 中 provider/model 为 null 时后端行为正确
- [ ] 确认 `applyAutoDirectorLlmOverride` 运行中调用时下一步骤正确使用新模型

## 阶段一：LLMSelector 组件改造

- [ ] 增加 `allowRouteModel` prop — provider 下拉增加"跟随路由配置"选项
- [ ] 选择"跟随路由配置"时，`onChange` 传入 `{ provider: undefined, model: undefined }`
- [ ] 选择"跟随路由配置"时，隐藏 model 下拉
- [ ] 增加 `showTemperature` prop — 独立显示 temperature 控件
- [ ] temperature 支持"跟随路由"和"自定义"两种模式

## 阶段二：创建面板改造

- [ ] "模型与质量"区块：模型来源（路由/自定义）+ modelTier + temperature
- [ ] "高级策略"折叠区：policy mode、allowExpensiveReview、mayOverwriteUserContent、autoRepair
- [ ] 修改 `NovelAutoDirectorSetupPanel.tsx`
- [ ] 修改 `autoDirector/StageModelRun.tsx`
- [ ] 修改 `autoDirectorCreate/StageModelRun.tsx`
- [ ] seed payload 构建逻辑适配新字段

## 阶段三：运行中切换模型

- [ ] 后端：扩展 `policy_update` 命令支持 `llmOverride`
- [ ] 后端：或新增独立 API 端点 `PATCH /api/director/tasks/:taskId/model`
- [ ] 前端：任务中心详情增加"切换模型"区块
- [ ] 前端："切换到路由模式"按钮（清除 provider/model）
- [ ] 前端："切换模型"展开 LLMSelector

## 阶段四：验证与收尾

- [ ] 类型检查：`pnpm typecheck`
- [ ] 单元测试：`pnpm test`
- [ ] 前端测试：`pnpm test:client`
- [ ] 手动验证：创建任务时选"跟随路由配置"，确认路由生效
- [ ] 手动验证：创建任务时设 modelTier，确认写入 seed payload
- [ ] 手动验证：运行中切换模型，确认下一步骤使用新模型
- [ ] 手动验证：运行中切回路由模式，确认下一步骤走路由
