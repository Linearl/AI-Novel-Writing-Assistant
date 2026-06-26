---
description: "REQ-2008 方案设计"
---

# REQ-2008 方案设计

## 1. 方案概述

分两层实现：**配置层**（模型上下文窗口透传）+ **压缩层**（阈值触发自动压缩）。配置层让系统知道每个模型的上下文容量，压缩层在使用率超标时自动降级。

### 1.1 关键决策

1. **1M 上下文 Checkbox 默认勾选**：本项目以长篇小说写作为主，1M 是绝大多数场景的首选。取消勾选时为 256K。
2. **行级截断而非 AI 摘要**：v1 先用零成本的截断方案，后续再引入 AI 摘要
3. **三层压缩策略**：丢弃低优先级块 → 截断消息历史 → 截断剩余块，渐进式降级
4. **`effectiveBudget = min(assetBudget, contextWindow * 0.7)`**：给输出预留 30% 空间

## 2. 实现细节

### 2.1 数据层

#### 2.1.1 Prisma Schema

```prisma
model ModelRouteConfig {
  // ... existing fields
  contextWindow Int?  // 输入上下文窗口（token 数）
}
```

Migration: 新增 nullable Int 列。

#### 2.1.2 Provider 默认值

`server/src/llm/providers.ts` — `ProviderConfig` 新增：

```typescript
defaultContextWindow?: number;  // provider 级默认上下文窗口
```

| Provider | defaultContextWindow |
| ---------- | -------------------- |
| openai | 128000 |
| anthropic | 200000 |
| deepseek | 65536 |
| google | 1048576 |
| moonshot | 128000 |
| 其他 | 1048576 (1M，项目默认) |

#### 2.1.3 路由解析链

`server/src/llm/modelRouter.ts`:

```typescript
interface ResolvedModel {
  // ... existing fields
  contextWindow: number;  // 最终解析值：DB > provider 默认 > 1048576 (1M)
}
```

`resolveModel()` 解析链：
1. 读 `ModelRouteConfig.contextWindow`（DB）
2. 回退到 `PROVIDERS[provider].defaultContextWindow`
3. 回退到 `1048576`（1M，项目默认）

#### 2.1.4 工厂透传

`server/src/llm/factory.ts`:

```typescript
interface ResolvedLLMClientOptions {
  // ... existing fields
  contextWindow: number;
}
```

`resolveLLMClientOptions()` 从 `resolveModel()` 读取 `contextWindow` 并透传。

#### 2.1.5 共享类型

`shared/types/novel.ts`:

```typescript
interface ModelRouteConfig {
  // ... existing fields
  contextWindow?: number | null;
}
```

#### 2.1.6 API 层

`server/src/routes/llm.ts`:

- `listModelRouteConfigs` 返回值包含 `contextWindow`
- `modelRouteUpsertSchema` 接受 `contextWindow`（可选）

### 2.2 压缩层

#### 2.2.1 上下文压缩服务

新增文件：`server/src/prompting/core/contextCompression.ts`

```typescript
interface CompressionResult {
  usedTokensBefore: number;
  usedTokensAfter: number;
  contextWindow: number;
  usageBefore: number;
  usageAfter: number;
  droppedBlocks: string[];
  truncatedBlocks: string[];
  droppedMessages: number;
}

const COMPRESS_THRESHOLD = 0.85;  // 触发阈值
const COMPRESS_TARGET = 0.40;     // 目标使用率

function shouldCompress(usageRatio: number): boolean {
  return usageRatio > COMPRESS_THRESHOLD;
}

function compressContext(params: {
  systemPrompt: string;
  messages: Array<{ role: string; content: string }>;
  contextBlocks: PromptContextBlock[];
  contextWindow: number;
}): {
  messages: Array<{ role: string; content: string }>;
  contextBlocks: PromptContextBlock[];
  log: CompressionResult;
}
```

压缩策略（按顺序执行，每步后检查是否达标）：

**阶段1：丢弃低优先级 optional 块**
```
while usageRatio > COMPRESS_TARGET:
  找到 priority 最低的 optional 块
  丢弃该块
  重新计算 usageRatio
```

**阶段2：截断消息历史**
```
while usageRatio > COMPRESS_TARGET:
  丢弃最早的非 system 消息
  重新计算 usageRatio
```

**阶段3：截断剩余 optional 块**
```
for each optional 块（按优先级升序）:
  调用 summarizeContextBlock(block, remainingBudget)
  重新计算 usageRatio
```

**阶段4：截断 required 块（最后手段）**
```
for each required 块（按优先级升序）:
  调用 summarizeContextBlock(block, remainingBudget)
  重新计算 usageRatio
```

#### 2.2.2 Prompt Runner 集成

`server/src/prompting/core/promptRunner.ts`:

```typescript
// 在 buildRenderContext() 中
const contextWindow = resolvedOptions.contextWindow;
const effectiveBudget = Math.min(
  promptAsset.contextPolicy.maxTokensBudget || Infinity,
  contextWindow * 0.7  // 预留 30% 给输出
);

// 构建上下文后检查使用率
const usage = calculateContextUsage(systemPrompt, messages, contextBlocks, contextWindow);
if (shouldCompress(usage.usageRatio)) {
  const { messages: compressed, contextBlocks: compressedBlocks, log } = compressContext({
    systemPrompt, messages, contextBlocks, contextWindow
  });
  console.warn('[ContextCompression]', log);
  // 使用压缩后的数据继续
}
```

#### 2.2.3 Chat 路由集成

`server/src/routes/chat.ts`:

```typescript
// 替换 .slice(-20) 为 token 感知截断
const contextWindow = resolvedModel.contextWindow;
const usage = calculateContextUsage("", messages, [], contextWindow);
if (shouldCompress(usage.usageRatio)) {
  const { messages: compressed, log } = compressContext({
    systemPrompt: "", messages, contextBlocks: [], contextWindow
  });
  messages = compressed;
  console.warn('[ChatContextCompression]', log);
}
```

#### 2.2.4 CreativeHub 集成

`server/src/routes/creativeHub.ts`:

```typescript
// 在 buildSeedMessages() 中
const contextWindow = resolvedModel.contextWindow;
const allMessages = [...baseMessages, ...incomingMessages];
const usage = calculateContextUsage("", allMessages, [], contextWindow);
if (shouldCompress(usage.usageRatio)) {
  // 保留最近 3 个 checkpoint 的消息
  // 丢弃更早的 checkpoint 消息
  // 重新检查使用率，必要时继续截断
}
```

### 2.3 前端

#### 2.3.1 设置 UI

`client/src/pages/settings/ModelRouteFields.tsx`:

```tsx
<FormField label="上下文窗口">
  <Checkbox
    checked={contextWindow === 1048576}
    onChange={(checked) => setContextWindow(checked ? 1048576 : 262144)}
  >
    1M 上下文（推荐，适合长篇写作）
  </Checkbox>
</FormField>
```

默认勾选 1M。取消勾选时为 256K。

#### 2.3.2 类型扩展

`client/src/pages/settings/modelRoutes.utils.ts`:

```typescript
interface RouteDraft {
  // ... existing fields
  contextWindow?: number | null;
}
```

`client/src/api/settings.ts`:

```typescript
interface ModelRouteConfig {
  // ... existing fields
  contextWindow?: number | null;
}
```

## 3. 数据流

```
用户在设置页配置上下文窗口（1M Checkbox，默认勾选）
  │
  v
ModelRouteConfig.contextWindow 存入 DB
  │
  v
resolveModel() 读取 DB → 回退 provider 默认 → 回退 1M
  │
  v
ResolvedLLMClientOptions.contextWindow 透传
  │
  ├── promptRunner.ts: effectiveBudget = min(assetBudget, contextWindow * 0.7)
  │     └── 使用率 > 85% → compressContext() → 降至 40%
  │
  ├── chat.ts: 使用率 > 85% → 消息截断 → 降至 40%
  │
  └── creativeHub.ts: 使用率 > 85% → checkpoint 压缩 → 降至 40%
```

## 4. 涉及文件

| 文件 | 改动类型 | 说明 |
| ---- | ---- | ---- |
| `server/src/prisma/schema.prisma` | 修改 | ModelRouteConfig 新增 contextWindow |
| `server/src/prisma/migrations/` | 新增 | migration 文件 |
| `server/src/llm/providers.ts` | 修改 | ProviderConfig 新增 defaultContextWindow |
| `server/src/llm/modelRouter.ts` | 修改 | ResolvedModel 新增 contextWindow，resolveModel() 解析链 |
| `server/src/llm/factory.ts` | 修改 | ResolvedLLMClientOptions 透传 contextWindow |
| `server/src/prompting/core/contextCompression.ts` | 新增 | 上下文压缩服务 |
| `server/src/prompting/core/contextBudget.ts` | 修改 | 导出 estimateTextTokens 和 calculateContextUsage |
| `server/src/prompting/core/promptRunner.ts` | 修改 | 集成模型感知预算 + 压缩触发 |
| `server/src/routes/chat.ts` | 修改 | 替换 .slice(-20) 为 token 感知截断 |
| `server/src/routes/creativeHub.ts` | 修改 | buildSeedMessages 增加压缩 |
| `server/src/routes/llm.ts` | 修改 | API 返回/接受 contextWindow |
| `shared/types/novel.ts` | 修改 | ModelRouteConfig 新增 contextWindow |
| `client/src/pages/settings/ModelRouteFields.tsx` | 修改 | 新增上下文窗口 Radio 按钮组 |
| `client/src/pages/settings/modelRoutes.utils.ts` | 修改 | RouteDraft 新增 contextWindow |
| `client/src/api/settings.ts` | 修改 | API 类型新增 contextWindow |
