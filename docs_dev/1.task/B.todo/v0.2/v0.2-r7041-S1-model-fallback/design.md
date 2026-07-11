---
description: "REQ-7041: 模型备用切换 — 技术设计"
update_time: "2026-07-11"
status: todo
---

# REQ-7041: 模型备用切换 — 技术设计

## 1. 架构设计

### 1.1 实现位置

在 `server/src/llm/structuredInvoke.ts` 的 `invokeStructuredLlmDetailed` 函数中，扩展现有的备用模型切换逻辑。

```
调用链路：
invokeStructuredLlmDetailed()
  ↓
resolveAttemptTarget()           // 解析主模型
  ↓
tryStructuredStrategies()        // 策略降级：json_schema → json_object → prompt_json
  ↓
❌ 失败（transport_error / auth_error / ...）
  ↓
★ invokeWithRetry()              // REQ-7040: 重试层
  ↓
❌ 重试仍失败
  ↓
★ selectFallbackModelByError()   // REQ-7041: 按错误类型选择备用模型（新增）
  ↓
tryStructuredStrategies()        // 用备用模型重试
  ↓
成功返回 / 最终失败
```

### 1.2 核心组件

```typescript
// 新增文件：server/src/llm/fallbackChain.ts

export interface FallbackModelEntry {
  provider: LLMProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface FallbackChainConfig {
  enabled: boolean;
  chain: FallbackModelEntry[];    // 最多3级
}

export type FallbackTriggerReason =
  | 'rate_limit'           // 429限流
  | 'auth_error'           // 401/403认证失败
  | 'model_unavailable'    // 503模型不可用
  | 'transport_error'      // 网络错误
  | 'output_format'        // 输出格式错误
  | 'unknown';             // 未知错误

export interface FallbackDecision {
  triggerReason: FallbackTriggerReason;
  targetEntry: FallbackModelEntry | null;  // null = 无可用备用
  chainIndex: number;                      // 在chain中的位置
 跳过原因?: string;                        // 如果跳过了某些级别
}
```

## 2. 详细设计

### 2.1 错误类型到备用策略的映射

```typescript
// server/src/llm/fallbackChain.ts

function classifyFallbackTrigger(error: StructuredOutputError): FallbackTriggerReason {
  // HTTP状态码分类
  if (error.httpStatus === 429) {
    return 'rate_limit';
  }
  if (error.httpStatus === 401 || error.httpStatus === 403) {
    return 'auth_error';
  }
  if (error.httpStatus === 503) {
    return 'model_unavailable';
  }

  // StructuredOutputError category 分类
  if (error.category === 'transport_error') {
    return 'transport_error';
  }
  if (
    error.category === 'schema_mismatch'
    || error.category === 'malformed_json'
    || error.category === 'incomplete_json'
    || error.category === 'thinking_pollution'
  ) {
    return 'output_format';
  }

  // 400 Bad Request 不触发切换
  if (error.httpStatus === 400) {
    return 'unknown';  // 映射到unknown，selectFallbackModelByError中会过滤
  }

  return 'unknown';
}
```

### 2.2 备用模型选择逻辑

```typescript
// server/src/llm/fallbackChain.ts

/**
 * 根据错误类型和备用链选择下一个备用模型。
 *
 * 选择策略：
 * - rate_limit / auth_error → 优先选择不同Provider的模型
 * - model_unavailable → 优先选择同Provider的不同模型
 * - transport_error → 优先选择不同Provider（网络不可达通常是Provider维度）
 * - output_format → 优先选择同Provider的不同模型（格式支持差异）
 * - unknown → 不切换
 */
export function selectFallbackModel(
  triggerReason: FallbackTriggerReason,
  currentProvider: LLMProvider,
  currentModel: string,
  chain: FallbackModelEntry[],
): FallbackDecision {
  if (triggerReason === 'unknown') {
    return {
      triggerReason,
      targetEntry: null,
      chainIndex: -1,
      跳过原因: 'unknown error type does not trigger fallback',
    };
  }

  const preferDifferentProvider = (
    triggerReason === 'rate_limit'
    || triggerReason === 'auth_error'
    || triggerReason === 'transport_error'
  );

  // 按优先级遍历备用链
  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i]!;

    // 跳过与当前模型完全相同的备用
    if (entry.provider === currentProvider && entry.model === currentModel) {
      continue;
    }

    // 优先级过滤
    if (preferDifferentProvider && entry.provider === currentProvider) {
      // 如果还有其他Provider可用，跳过同Provider的
      const hasOtherProvider = chain.slice(i + 1).some(
        (e) => e.provider !== currentProvider,
      );
      if (hasOtherProvider) {
        continue;
      }
    }

    return {
      triggerReason,
      targetEntry: entry,
      chainIndex: i,
    };
  }

  return {
    triggerReason,
    targetEntry: null,
    chainIndex: -1,
    跳过原因: 'no suitable fallback model in chain',
  };
}
```

### 2.3 配置存储（扩展 AppSetting）

```typescript
// server/src/llm/fallbackChain.ts

const FALLBACK_CHAIN_PREFIX = "fallbackChain.";

interface StoredFallbackChainConfig {
  enabled: boolean;
  entries: Array<{
    provider: LLMProvider;
    model: string;
    temperature: number;
    maxTokens: number | null;
  }>;
}

export async function getFallbackChainConfig(
  forceRefresh = false,
): Promise<FallbackChainConfig> {
  // 从 AppSetting 表读取
  // key格式: fallbackChain.enabled, fallbackChain.0.provider, fallbackChain.0.model, ...
  // 向后兼容: 如果没有chain配置，从 structuredFallbackSettings 构建单级chain
}

export async function saveFallbackChainConfig(
  config: Partial<StoredFallbackChainConfig>,
): Promise<FallbackChainConfig> {
  // 写入 AppSetting 表
}
```

### 2.4 集成到 invokeStructuredLlmDetailed

```typescript
// server/src/llm/structuredInvoke.ts (修改)

export async function invokeStructuredLlmDetailed<T>(
  input: StructuredInvokeInput<T>,
): Promise<StructuredInvokeResult<T>> {
  const primaryTarget = await resolveAttemptTarget({ ... });

  // 现有逻辑：单一备用模型
  const fallbackSettings = input.disableFallbackModel
    ? null
    : await getStructuredFallbackSettings();

  // REQ-7041: 新增多级备用链
  const fallbackChain = input.disableFallbackModel
    ? null
    : await getFallbackChainConfig();

  try {
    return await tryStructuredStrategies({
      baseInput: input,
      target: primaryTarget,
      fallbackAvailable: fallbackEnabled,
      fallbackUsed: false,
    });
  } catch (primaryError) {
    // REQ-7040: 先尝试重试
    if (isRetryableError(primaryError) && fallbackSettings?.retryConfig) {
      try {
        return await invokeWithRetry(
          () => tryStructuredStrategies({
            baseInput: input,
            target: primaryTarget,
            fallbackAvailable: fallbackEnabled,
            fallbackUsed: false,
          }),
          fallbackSettings.retryConfig,
          isRetryableError,
        );
      } catch {
        // 重试失败，继续到备用模型切换
      }
    }

    // REQ-7041: 按错误类型选择备用模型
    if (fallbackChain?.enabled && fallbackChain.chain.length > 0) {
      const error = wrapStructuredInvokeError({
        label: input.label,
        error: primaryError,
        strategy: "json_schema",
        profile: primaryTarget.profile,
        fallbackAvailable: true,
        fallbackUsed: false,
      });

      const triggerReason = classifyFallbackTrigger(error);
      let lastError = error;

      // 遍历备用链
      const decision = selectFallbackModel(
        triggerReason,
        primaryTarget.provider,
        primaryTarget.model,
        fallbackChain.chain,
      );

      if (decision.targetEntry) {
        logFallbackSwitch({
          triggerReason,
          from: { provider: primaryTarget.provider, model: primaryTarget.model },
          to: decision.targetEntry,
          chainIndex: decision.chainIndex,
        });

        try {
          const fallbackTarget = await resolveAttemptTarget({
            provider: decision.targetEntry.provider,
            model: decision.targetEntry.model,
            temperature: decision.targetEntry.temperature,
            maxTokens: decision.targetEntry.maxTokens ?? undefined,
            taskType: input.taskType ?? "planner",
          });
          return await tryStructuredStrategies({
            baseInput: input,
            target: fallbackTarget,
            fallbackAvailable: true,
            fallbackUsed: true,
          });
        } catch (fallbackError) {
          lastError = fallbackError instanceof StructuredOutputError
            ? fallbackError
            : error;
          logFallbackFailed({
            triggerReason,
            target: decision.targetEntry,
            error: fallbackError,
          });
        }
      }
    }

    // 向后兼容：使用原有单一备用模型逻辑
    if (!fallbackChain?.enabled && fallbackSettings) {
      // ... 保持原有逻辑不变
    }

    throw primaryError;
  }
}
```

## 3. 数据模型

### 3.1 配置存储（AppSetting表）

| Key | 值 | 说明 |
|-----|------|------|
| `fallbackChain.enabled` | `true` / `false` | 是否启用多级备用 |
| `fallbackChain.0.provider` | `deepseek` / `openai` / ... | 第1级备用Provider |
| `fallbackChain.0.model` | `deepseek-chat` | 第1级备用Model |
| `fallbackChain.0.temperature` | `0.3` | 第1级备用Temperature |
| `fallbackChain.0.maxTokens` | `8192` 或空 | 第1级备用MaxTokens |
| `fallbackChain.1.provider` | ... | 第2级备用Provider |
| ... | ... | ... |

### 3.2 日志格式

```typescript
interface FallbackSwitchLog {
  timestamp: string;
  level: 'info' | 'warn';
  event: 'fallback_switch' | 'fallback_failed';
  context: {
    triggerReason: FallbackTriggerReason;
    fromProvider: string;
    fromModel: string;
    toProvider: string;
    toModel: string;
    chainIndex: number;
    errorMessage?: string;
  };
}
```

## 4. 接口设计

### 4.1 核心接口

```typescript
// 错误分类
export function classifyFallbackTrigger(
  error: StructuredOutputError,
): FallbackTriggerReason;

// 备用模型选择
export function selectFallbackModel(
  triggerReason: FallbackTriggerReason,
  currentProvider: LLMProvider,
  currentModel: string,
  chain: FallbackModelEntry[],
): FallbackDecision;

// 配置读取
export async function getFallbackChainConfig(
  forceRefresh?: boolean,
): Promise<FallbackChainConfig>;

// 配置写入
export async function saveFallbackChainConfig(
  config: Partial<StoredFallbackChainConfig>,
): Promise<FallbackChainConfig>;
```

### 4.2 日志接口

```typescript
// 切换日志
export function logFallbackSwitch(params: {
  triggerReason: FallbackTriggerReason;
  from: { provider: string; model: string };
  to: FallbackModelEntry;
  chainIndex: number;
}): void;

// 切换失败日志
export function logFallbackFailed(params: {
  triggerReason: FallbackTriggerReason;
  target: FallbackModelEntry;
  error: unknown;
}): void;
```

## 5. 实现步骤

### Phase 1: 核心逻辑（0.25天）

1. 创建 `server/src/llm/fallbackChain.ts`
2. 实现 `classifyFallbackTrigger` 函数
3. 实现 `selectFallbackModel` 函数
4. 实现配置读写 `getFallbackChainConfig` / `saveFallbackChainConfig`
5. 实现日志记录

### Phase 2: 集成到现有代码（0.25天）

1. 修改 `invokeStructuredLlmDetailed` 添加多级备用逻辑
2. 保持向后兼容（无chain配置时使用原单一备用）
3. 与REQ-7040重试机制协同

### Phase 3: 测试（0.5天）

1. 单元测试：错误分类
2. 单元测试：备用模型选择
3. 单元测试：多级备用链遍历
4. 集成测试：完整调用链路（重试 → 备用切换）

## 6. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 备用模型也不可用 | 所有模型失败 | 中 | 多级备用 + 明确报错 |
| 配置错误 | 切换行为异常 | 低 | 配置校验 + 默认值 |
| 与REQ-7040冲突 | 重复尝试 | 低 | 明确的执行顺序 |
| 向后兼容 | 现有配置失效 | 低 | 无chain时使用原逻辑 |

## 7. 测试计划

### 7.1 单元测试

```typescript
describe('classifyFallbackTrigger', () => {
  it('should classify 429 as rate_limit', () => { ... });
  it('should classify 401 as auth_error', () => { ... });
  it('should classify 503 as model_unavailable', () => { ... });
  it('should classify transport_error category correctly', () => { ... });
  it('should classify schema_mismatch as output_format', () => { ... });
  it('should classify 400 as unknown (no fallback)', () => { ... });
});

describe('selectFallbackModel', () => {
  it('should select different provider for rate_limit', () => { ... });
  it('should select same provider different model for output_format', () => { ... });
  it('should skip identical provider+model', () => { ... });
  it('should return null for unknown trigger', () => { ... });
  it('should fall back to same provider if no other available', () => { ... });
});
```

### 7.2 集成测试

```typescript
describe('invokeStructuredLlmDetailed with fallback chain', () => {
  it('should fallback to second provider on rate_limit', () => { ... });
  it('should try all chain levels before failing', () => { ... });
  it('should skip retry for non-retryable errors', () => { ... });
  it('should use original fallback when chain disabled', () => { ... });
});
```

## 8. 交付物

- [ ] `server/src/llm/fallbackChain.ts` — 备用链核心逻辑
- [ ] `server/src/llm/structuredInvoke.ts` — 修改集成
- [ ] `server/tests/llm/fallbackChain.test.ts` — 单元测试
- [ ] `server/tests/llm/structuredInvoke.fallback.test.ts` — 集成测试
- [ ] 文档更新
