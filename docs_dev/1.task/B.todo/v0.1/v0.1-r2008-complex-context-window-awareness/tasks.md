---
description: "REQ-2008 任务拆解"
---

# REQ-2008 任务拆解

> 状态：⏳ 进行中

## 任务清单

| # | 任务 | 优先级 | 预估 | 状态 |
| --- | --- | --- | --- | --- |
| **配置层** | | | | |
| T1 | Prisma schema：ModelRouteConfig 新增 contextWindow + migration | P0 | 0.5h | ⬜ 待开始 |
| T2 | 共享类型：ModelRouteConfig 新增 contextWindow | P0 | 0.25h | ⬜ 待开始 |
| T3 | Provider 默认值：providers.ts 新增 defaultContextWindow | P0 | 0.5h | ⬜ 待开始 |
| T4 | 路由解析：modelRouter.ts resolveModel() 解析 contextWindow | P0 | 1h | ⬜ 待开始 |
| T5 | 工厂透传：factory.ts ResolvedLLMClientOptions 透传 contextWindow | P0 | 0.5h | ⬜ 待开始 |
| T6 | API 层：llm.ts 返回/接受 contextWindow | P0 | 0.5h | ⬜ 待开始 |
| T7 | 前端设置 UI：ModelRouteFields 新增 1M 上下文 Checkbox（默认勾选） | P0 | 1h | ⬜ 待开始 |
| T8 | 前端类型：modelRoutes.utils + api/settings.ts 扩展 | P0 | 0.25h | ⬜ 待开始 |
| **压缩层** | | | | |
| T9 | 新增 contextCompression.ts：压缩服务核心逻辑 | P0 | 2h | ⬜ 待开始 |
| T10 | contextBudget.ts：导出 estimateTextTokens 和 calculateContextUsage | P0 | 0.5h | ⬜ 待开始 |
| T11 | promptRunner.ts：集成模型感知预算 + 压缩触发 | P0 | 1.5h | ⬜ 待开始 |
| T12 | chat.ts：替换 .slice(-20) 为 token 感知截断 | P1 | 1h | ⬜ 待开始 |
| T13 | creativeHub.ts：buildSeedMessages 增加 checkpoint 压缩 | P1 | 1.5h | ⬜ 待开始 |
| **测试** | | | | |
| T14 | 单元测试：contextCompression.ts 压缩逻辑 | P1 | 1.5h | ⬜ 待开始 |
| T15 | 单元测试：modelRouter.ts contextWindow 解析 | P1 | 0.5h | ⬜ 待开始 |
| T16 | 集成测试：promptRunner 使用率超阈值触发压缩 | P1 | 1h | ⬜ 待开始 |
| T17 | 端到端验证：设置 → 长对话 → 自动压缩 | P1 | 0.5h | ⬜ 待开始 |

---

## 逐项展开

### T1: Prisma Schema

**改动点**: `server/src/prisma/schema.prisma` — ModelRouteConfig 模型
**DoD**: `contextWindow Int?` 字段存在，migration 成功

### T2: 共享类型

**改动点**: `shared/types/novel.ts`
**DoD**: `contextWindow?: number | null` 字段存在，shared build 通过

### T3: Provider 默认值

**改动点**: `server/src/llm/providers.ts`
**DoD**: 每个 provider 有 `defaultContextWindow`，未知 provider 默认 1048576（1M）

### T4: 路由解析

**改动点**: `server/src/llm/modelRouter.ts`
**DoD**: `ResolvedModel.contextWindow` 按 DB → provider 默认 → 1M 链解析

### T5: 工厂透传

**改动点**: `server/src/llm/factory.ts`
**DoD**: `ResolvedLLMClientOptions.contextWindow` 从 resolveModel 读取

### T6: API 层

**改动点**: `server/src/routes/llm.ts`
**DoD**: GET 返回 contextWindow，PUT 接受 contextWindow

### T7-T8: 前端

**改动点**: `ModelRouteFields.tsx`、`modelRoutes.utils.ts`、`api/settings.ts`
**DoD**: 设置页显示 1M 上下文 Checkbox（默认勾选），取消勾选时为 256K，保存到 API

### T9: 压缩服务

**改动点**: `server/src/prompting/core/contextCompression.ts`（新增）
**DoD**: `compressContext()` 实现四阶段压缩，返回 CompressionResult

### T10: Token 估算导出

**改动点**: `server/src/prompting/core/contextBudget.ts`
**DoD**: `estimateTextTokens()` 和 `calculateContextUsage()` 可从外部调用

### T11: Prompt Runner 集成

**改动点**: `server/src/prompting/core/promptRunner.ts`
**DoD**: effectiveBudget 使用 contextWindow * 0.7，超 85% 触发压缩

### T12: Chat 集成

**改动点**: `server/src/routes/chat.ts`
**DoD**: 替换 .slice(-20) 为 token 感知截断

### T13: CreativeHub 集成

**改动点**: `server/src/routes/creativeHub.ts`
**DoD**: buildSeedMessages 按 token 预算截断 checkpoint 消息

### T14-T17: 测试

**DoD**: 压缩逻辑覆盖所有阶段，路由解析覆盖 DB/默认/回退，端到端验证通过
