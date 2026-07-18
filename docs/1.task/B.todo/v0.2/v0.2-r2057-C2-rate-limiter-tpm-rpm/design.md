---
description: "REQ-2057 设计文档：LLM 限流器 TPM/RPM 增强方案"
reqId: 2057
type: design
status: draft
created: 2026-07-18
---

# 设计文档：LLM 限流器 TPM/RPM 增强

## 架构变更

### 当前架构

```
ProviderModelRequestLimiter
  ├── concurrencyLimit (信号量)
  ├── requestIntervalMs (节流)
  └── FIFO 队列
```

限流器 key = `provider:model:concurrencyLimit:requestIntervalMs`，通过 `sharedLimiters` Map 全局缓存。

### 目标架构

```
ProviderModelRequestLimiter
  ├── concurrencyLimit (信号量)          ← 保留
  ├── requestIntervalMs (节流)           ← 保留
  ├── rpmWindow (滑动窗口计数器)         ← 新增
  │     └── Map<timestamp, count>，1 分钟窗口
  ├── tpmBucket (令牌桶)                ← 新增
  │     └── capacity=tpm, available=tpm, refillRate=tpm/60/sec
  │     └── 事后扣减：请求完成后从 usage 回填
  └── FIFO 队列                          ← 保留，三维度取最严
```

## 关键设计决策

### D1: RPM 实现 — 滑动窗口 vs 固定窗口

| 方案 | 优点 | 缺点 |
|------|------|------|
| 固定窗口（每分钟重置） | 实现简单 | 窗口边界突刺（如 59 秒发 100 个，下一秒又 100 个） |
| 滑动窗口（最近 60 秒） | 平滑 | 需要存时间戳，内存略多 |
| 令牌桶 | 平滑 + 可 burst | 实现复杂度中等 |

**选择**：滑动窗口。实现简单且避免边界突刺，每请求存一个时间戳（60 秒后过期清理），内存开销可忽略。

### D2: TPM 实现 — 事后扣减 vs 预估扣减

| 方案 | 优点 | 缺点 |
|------|------|------|
| 预估扣减（请求前按 maxTokens 估算） | 简单 | 不准确，容易过度限制或不足 |
| 事后扣减（从 response.usage 回填） | 精确 | 需要修改 invoke 调用链 |

**选择**：事后扣减。在 `limiter.run()` 的 `.then()` 中从 LLM 响应提取 usage 回填。预估作为可选的前置检查（如果 provider 支持）。

### D3: 三维度放行逻辑

```
processQueue():
  1. 检查 concurrencyLimit → activeCount >= limit? 排队
  2. 检查 rpmWindow → 最近 60 秒请求数 >= rpm? 排队
  3. 检查 tpmBucket → available < 0? 排队
  4. 三个都通过 → 放行
```

### D4: TPM 回填调用链

当前 LLM 调用路径：
```
invokeStructuredLlm → invokeStructuredAttempt → llm.invoke(messages, options)
```

`llm.invoke()` 返回的 result 包含 `response.usage`（OpenAI 兼容格式）。回填逻辑加在 `ProviderModelRequestLimiter.run()` 的 `.then()` 回调中：

```
run(operation) {
  return new Promise((resolve, reject) => {
    queue.push(() => {
      activeCount += 1;
      operation()
        .then((result) => {
          // 从 result 中提取 usage 并回填 TPM
          const usage = extractUsage(result);
          if (usage) tpmBucket.consume(usage.totalTokens);
          resolve(result);
        }, reject)
        .finally(() => { activeCount--; processQueue(); });
    });
    processQueue();
  });
}
```

### D5: 限流器 key 变更

当前 key 包含 `concurrencyLimit` 和 `requestIntervalMs` 的值。新增 `rpm` 和 `tpm` 后，key 需要包含这些值以保证不同配置的 provider 走不同的限流器实例：

```
key = `${provider}:${model}:${concurrencyLimit}:${requestIntervalMs}:${rpm}:${tpm}`
```

## 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `server/src/llm/requestLimiter.ts` | 重构 | 新增 RPM 滑动窗口 + TPM 令牌桶 + 三维度放行 |
| `server/src/llm/factory.ts` | 修改 | 加载 rpm/tpm 配置，传递给 limiter |
| `server/src/prisma/schema.sqlite.prisma` | 修改 | ProviderSecret 新增 rpm、tpm 字段 |
| `server/src/prisma/schema.prisma` | 修改 | 同上 |
| `server/src/prisma/migrations/` | 新增 | 迁移文件 |
| `server/src/services/settings/secretStore/DatabaseSecretStore.ts` | 修改 | 读写 rpm/tpm 字段 |
| `client/src/pages/settings/` | 修改 | provider 表单新增 rpm/tpm 输入框 |

## 接口变更

### ProviderModelLimitOptions 扩展

```typescript
interface ProviderModelLimitOptions {
  provider: LLMProvider;
  model: string;
  concurrencyLimit?: number | null;
  requestIntervalMs?: number | null;
  rpm?: number | null;       // 新增
  tpm?: number | null;       // 新增
}
```

### ProviderSecret 扩展

```typescript
// Prisma schema
rpm   Int @default(100)
tpm   Int @default(10000000)
```

## 错误处理

| 场景 | 行为 |
|------|------|
| LLM 响应无 usage 字段 | 跳过 TPM 扣减，debug 日志 |
| usage 值异常（负数/超大） | 忽略，不扣减 |
| TPM 桶长时间无请求 | 不主动 refill，下次请求时按时间差计算 refill |
| RPM 窗口内存积累 | 每次 processQueue 时清理过期时间戳 |
