---
description: "REQ-7040: API失败自动重试 — 技术设计"
update_time: "2026-07-11"
status: todo
---

# REQ-7040: API失败自动重试 — 技术设计

## 1. 架构设计

### 1.1 实现位置

在 `server/src/llm/structuredInvoke.ts` 的 `invokeStructuredLlmDetailed` 函数中添加重试包装层。

```
调用链路：
invokeStructuredLlmDetailed()
  ↓
tryStructuredStrategies()  // 策略降级：json_schema → json_object → prompt_json
  ↓
❌ 失败（transport_error）
  ↓
★ invokeWithRetry()  // 重试层（新增）
  ↓
成功返回 / 最终失败
```

### 1.2 核心组件

```typescript
// 新增文件：server/src/llm/retryHandler.ts

interface RetryConfig {
  maxRetries: number;      // 默认3
  baseDelayMs: number;     // 默认1000
  maxDelayMs: number;      // 默认60000
}

interface RetryContext {
  attempt: number;
  totalAttempts: number;
  lastError: Error;
  waitTimeMs: number;
}

async function invokeWithRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  isRetryable: (error: Error) => boolean
): Promise<T> {
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryable(error) || attempt === config.maxRetries) {
        throw error;
      }
      
      const waitTime = calculateWaitTime(error, attempt, config);
      await sleep(waitTime);
      
      logRetry(attempt + 1, error, waitTime);
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

## 2. 详细设计

### 2.1 可重试错误判断

```typescript
function isRetryableError(error: any): boolean {
  // 网络错误
  if (error.code === 'ECONNRESET' || 
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND') {
    return true;
  }
  
  // HTTP状态码
  if (error.status === 429 ||  // 限流
      error.status === 502 ||  // 网关错误
      error.status === 503 ||  // 服务不可用
      error.status === 504) {  // 网关超时
    return true;
  }
  
  // 不可重试错误
  if (error.status === 401 ||  // 未授权
      error.status === 403 ||  // 禁止
      error.status === 400) {  // 请求错误
    return false;
  }
  
  return false;
}
```

### 2.2 等待时间计算

```typescript
function calculateWaitTime(
  error: any,
  attempt: number,
  config: RetryConfig
): number {
  // 429限流：解析Retry-After头
  if (error.status === 429 && error.headers?.['retry-after']) {
    const retryAfter = parseRetryAfter(error.headers['retry-after']);
    return Math.min(retryAfter * 1000, config.maxDelayMs);
  }
  
  // 其他错误：指数退避
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  return Math.min(exponentialDelay, config.maxDelayMs);
}

function parseRetryAfter(value: string): number {
  // 尝试解析为秒数
  const seconds = parseInt(value, 10);
  if (!isNaN(seconds)) {
    return seconds;
  }
  
  // 尝试解析为HTTP日期
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return Math.max(0, Math.floor((date.getTime() - Date.now()) / 1000));
  }
  
  // 默认1秒
  return 1;
}
```

### 2.3 集成到现有代码

```typescript
// server/src/llm/structuredInvoke.ts

async function invokeStructuredLlmDetailed<T>(
  prompt: string,
  schema: ZodSchema<T>,
  options: InvokeOptions
): Promise<T> {
  
  // 现有逻辑：策略降级
  const result = await tryStructuredStrategies(prompt, schema, options);
  
  // 如果成功，直接返回
  if (result.success) {
    return result.data;
  }
  
  // 如果是可重试错误，执行重试
  if (isRetryableError(result.error)) {
    return await invokeWithRetry(
      () => tryStructuredStrategies(prompt, schema, options),
      options.retryConfig || defaultRetryConfig,
      isRetryableError
    );
  }
  
  // 其他错误，直接抛出
  throw result.error;
}
```

## 3. 数据模型

### 3.1 配置存储

```typescript
// Provider Secret表新增字段
interface ProviderSecret {
  // 现有字段...
  
  // 新增重试配置
  retryConfig?: {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
  };
}
```

### 3.2 日志格式

```typescript
interface RetryLog {
  timestamp: string;
  level: 'warn' | 'error';
  message: string;
  context: {
    attempt: number;
    totalAttempts: number;
    errorCode: string;
    errorMessage: string;
    waitTimeMs: number;
    retryable: boolean;
  };
}
```

## 4. 接口设计

### 4.1 内部接口

```typescript
// 重试处理器
export async function invokeWithRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
  isRetryable: (error: Error) => boolean
): Promise<T>;

// 错误分类
export function isRetryableError(error: any): boolean;

// 等待时间计算
export function calculateWaitTime(
  error: any,
  attempt: number,
  config: RetryConfig
): number;
```

### 4.2 配置接口

```typescript
// 获取Provider重试配置
export async function getRetryConfig(
  providerId: string
): Promise<RetryConfig>;

// 更新Provider重试配置
export async function updateRetryConfig(
  providerId: string,
  config: RetryConfig
): Promise<void>;
```

## 5. 实现步骤

### Phase 1: 核心重试逻辑（0.5天）

1. 创建 `server/src/llm/retryHandler.ts`
2. 实现 `invokeWithRetry` 函数
3. 实现 `isRetryableError` 函数
4. 实现 `calculateWaitTime` 函数
5. 实现日志记录

### Phase 2: 集成到现有代码（0.5天）

1. 修改 `invokeStructuredLlmDetailed` 添加重试逻辑
2. 从Provider Secret读取配置
3. 处理配置不存在的情况（使用默认值）

### Phase 3: 测试（0.5天）

1. 单元测试：重试逻辑
2. 单元测试：错误分类
3. 单元测试：等待时间计算
4. 集成测试：完整调用链路

## 6. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 重试风暴 | API限流加剧 | 中 | 最大重试次数限制 + 最大等待时间 |
| 配置错误 | 重试行为异常 | 低 | 配置校验 + 默认值 |
| 日志过多 | 存储成本 | 低 | 仅记录关键事件 |
| 策略冲突 | 与现有降级逻辑冲突 | 低 | 在策略降级之后重试 |

## 7. 测试计划

### 7.1 单元测试

```typescript
// 测试场景
describe('invokeWithRetry', () => {
  it('should retry on network error', async () => {
    // 模拟网络错误
    // 验证重试3次
    // 验证指数退避
  });
  
  it('should not retry on auth error', async () => {
    // 模拟401错误
    // 验证不重试
    // 验证直接抛出
  });
  
  it('should parse Retry-After header', async () => {
    // 模拟429响应
    // 验证解析Retry-After
    // 验证等待指定时间
  });
});
```

### 7.2 集成测试

```typescript
// 测试场景
describe('invokeStructuredLlmDetailed with retry', () => {
  it('should succeed after retry', async () => {
    // 模拟第一次失败，第二次成功
    // 验证最终返回成功结果
  });
  
  it('should fail after max retries', async () => {
    // 模拟连续失败
    // 验证抛出错误
    // 验证重试次数正确
  });
});
```

## 8. 交付物

- [ ] `server/src/llm/retryHandler.ts` - 重试处理器
- [ ] `server/src/llm/structuredInvoke.ts` - 修改集成
- [ ] `server/tests/llm/retryHandler.test.ts` - 单元测试
- [ ] `server/tests/llm/structuredInvoke.retry.test.ts` - 集成测试
- [ ] 文档更新
