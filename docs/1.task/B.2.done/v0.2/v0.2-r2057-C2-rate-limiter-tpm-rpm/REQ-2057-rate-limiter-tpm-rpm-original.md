---
description: "REQ-2057 需求文档（冻结副本）：LLM 限流器增强 — TPM/RPM 支持"
reqId: 2057
type: requirement
status: frozen
created: 2026-07-18
---

# REQ-2057: LLM 限流器增强 — TPM/RPM 支持（原始冻结副本）

## 背景

当前 LLM 限流器 `ProviderModelRequestLimiter`（`server/src/llm/requestLimiter.ts`）仅支持两层限制：
1. `concurrencyLimit` — 同时在飞的请求数上限
2. `requestIntervalMs` — 两次请求之间的最小间隔

模型厂商（DeepSeek、OpenAI 等）通常限制 TPM（tokens/min）、RPM（requests/min）、并发请求数三个维度。当前限流器不覆盖 TPM/RPM，用户配置不当或两本小说并行生产时容易触发厂商 rate limit（429 错误）。

## 需求

### 1. RPM 支持
- 滑动窗口计数器，1 分钟窗口
- 窗口内请求数达到上限时，请求排队等待下一窗口

### 2. TPM 支持
- 令牌桶模式，事后扣减
- 从 LLM 响应的 `usage.promptTokens + usage.completionTokens` 回填
- 桶满时请求排队等待

### 3. 三维度取最严
- 并发数 / RPM / TPM 三者各自独立检查
- 任一维度超限则排队

### 4. Schema 变更
- ProviderSecret 表新增 `rpm Int @default(100)` 和 `tpm Int @default(10000000)`
- 向后兼容：已有记录使用默认值

### 5. 设置页
- 创建/编辑 provider 时展示 rpm、tpm、concurrencyLimit 字段
- 默认预填合理值
