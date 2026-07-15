---
description: "REQ-7042: 错误分类器 — 技术设计"
update_time: "2026-07-11"
status: todo
---

# REQ-7042: 错误分类器 — 技术设计

## 1. 架构设计

### 1.1 实现位置

在 `server/src/llm/` 目录下新建 `errorClassifier.ts`，作为错误分类的单一入口。该文件与现有 `structuredOutput.ts`、`structuredInvoke.ts` 同层，不修改现有文件。

```
调用链路：
LLM 调用失败
  ↓
classifyError(error)          // 新增：统一错误分类入口
  ↓
ErrorHandlingMeta             // 返回：分类结果 + 处理策略元数据
  ↓
┌─── isRetryable=true ───→ invokeWithRetry()     // REQ-7040
├─── recommendedAction=switch_provider → 模型备用切换  // REQ-7041
├─── recommendedAction=require_user_config → 提示用户配置
└─── recommendedAction=require_human_intervention → 报错 + 停止
```

### 1.2 核心组件

```typescript
// 新增文件：server/src/llm/errorClassifier.ts

/** 统一错误分类枚举 */
export type ErrorCategory =
  | 'retryable_transport'
  | 'rate_limited'
  | 'auth_error'
  | 'invalid_request'
  | 'strategy_fallback'
  | 'model_unavailable'
  | 'output_parse_error'
  | 'system_error';

/** 错误严重度 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/** 推荐处理动作 */
export type RecommendedAction =
  | 'retry_with_backoff'
  | 'wait_and_retry'
  | 'switch_provider'
  | 'degrade_strategy'
  | 'require_user_config'
  | 'require_human_intervention';

/** 错误分类的处理策略元数据 */
export interface ErrorHandlingMeta {
  category: ErrorCategory;
  severity: ErrorSeverity;
  isRetryable: boolean;
  recommendedAction: RecommendedAction;
  userMessage?: string;
}

/** 分类入口函数 */
export function classifyError(error: unknown): ErrorHandlingMeta;
```

## 2. 详细设计

### 2.1 分类映射表

```typescript
const ERROR_HANDLING_MAP: Record<ErrorCategory, ErrorHandlingMeta> = {
  retryable_transport: {
    category: 'retryable_transport',
    severity: 'medium',
    isRetryable: true,
    recommendedAction: 'retry_with_backoff',
    userMessage: '网络连接异常，正在自动重试...',
  },
  rate_limited: {
    category: 'rate_limited',
    severity: 'medium',
    isRetryable: true,
    recommendedAction: 'wait_and_retry',
    userMessage: '请求频率超限，正在等待后重试...',
  },
  auth_error: {
    category: 'auth_error',
    severity: 'high',
    isRetryable: false,
    recommendedAction: 'require_user_config',
    userMessage: 'API Key 无效或权限不足，请在设置页面检查。',
  },
  invalid_request: {
    category: 'invalid_request',
    severity: 'high',
    isRetryable: false,
    recommendedAction: 'require_user_config',
    userMessage: '请求参数错误，请检查模型配置。',
  },
  strategy_fallback: {
    category: 'strategy_fallback',
    severity: 'low',
    isRetryable: true,
    recommendedAction: 'degrade_strategy',
    userMessage: '当前模型格式兼容性不足，正在尝试替代策略...',
  },
  model_unavailable: {
    category: 'model_unavailable',
    severity: 'high',
    isRetryable: true,
    recommendedAction: 'switch_provider',
    userMessage: '当前模型服务不可用，正在切换到备用模型...',
  },
  output_parse_error: {
    category: 'output_parse_error',
    severity: 'medium',
    isRetryable: true,
    recommendedAction: 'retry_with_backoff',
    userMessage: '输出格式异常，正在重试...',
  },
  system_error: {
    category: 'system_error',
    severity: 'critical',
    isRetryable: false,
    recommendedAction: 'require_human_intervention',
    userMessage: '系统内部错误，请联系管理员。',
  },
};
```

### 2.2 classifyError 核心逻辑

```typescript
export function classifyError(error: unknown): ErrorHandlingMeta {
  // 1. StructuredOutputError 直接读取 category
  if (error instanceof StructuredOutputError) {
    return classifyFromStructuredOutputCategory(error.category);
  }

  // 2. HTTP 状态码匹配
  const httpStatus = extractHttpStatus(error);
  if (httpStatus !== null) {
    return classifyFromHttpStatus(httpStatus, error);
  }

  // 3. 网络错误码匹配
  const networkCode = extractNetworkCode(error);
  if (networkCode !== null) {
    return classifyFromNetworkCode(networkCode);
  }

  // 4. 安全兜底
  return ERROR_HANDLING_MAP.system_error;
}
```

### 2.3 子分类函数

```typescript
/** 从 StructuredOutputErrorCategory 映射 */
function classifyFromStructuredOutputCategory(
  category: StructuredOutputErrorCategory
): ErrorHandlingMeta {
  const mapping: Record<StructuredOutputErrorCategory, ErrorCategory> = {
    transport_error: 'retryable_transport',
    unsupported_native_json: 'strategy_fallback',
    thinking_pollution: 'output_parse_error',
    incomplete_json: 'output_parse_error',
    malformed_json: 'output_parse_error',
    schema_mismatch: 'strategy_fallback',
  };
  return ERROR_HANDLING_MAP[mapping[category]];
}

/** 从 HTTP 状态码映射 */
function classifyFromHttpStatus(
  status: number,
  error: unknown
): ErrorHandlingMeta {
  if (status === 429) {
    return ERROR_HANDLING_MAP.rate_limited;
  }
  if (status === 401 || status === 403) {
    return ERROR_HANDLING_MAP.auth_error;
  }
  if (status === 400) {
    return ERROR_HANDLING_MAP.invalid_request;
  }
  if (status === 502 || status === 503 || status === 504) {
    return ERROR_HANDLING_MAP.retryable_transport;
  }
  // 5xx 兜底
  return ERROR_HANDLING_MAP.model_unavailable;
}

/** 从网络错误码映射 */
function classifyFromNetworkCode(code: string): ErrorHandlingMeta {
  const retryable = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED'];
  if (retryable.includes(code)) {
    return ERROR_HANDLING_MAP.retryable_transport;
  }
  return ERROR_HANDLING_MAP.system_error;
}

/** 提取 HTTP 状态码 */
function extractHttpStatus(error: unknown): number | null {
  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>;
    if (typeof e.status === 'number') return e.status;
    if (typeof e.statusCode === 'number') return e.statusCode;
  }
  return null;
}

/** 提取网络错误码 */
function extractNetworkCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null) {
    const e = error as Record<string, unknown>;
    if (typeof e.code === 'string') return e.code;
  }
  return null;
}
```

## 3. 数据模型

### 3.1 与现有类型的关系

```
StructuredOutputErrorCategory  ──映射──→  ErrorCategory
(unsupported_native_json,                (strategy_fallback,
 thinking_pollution,                      output_parse_error,
 incomplete_json,                         retryable_transport,
 malformed_json,                          ...)
 schema_mismatch,
 transport_error)

HTTP 状态码  ──映射──→  ErrorCategory
(401/403, 400, 429, 502/503/504)     (auth_error, invalid_request,
                                       rate_limited, retryable_transport)

网络错误码  ──映射──→  ErrorCategory
(ECONNRESET, ETIMEDOUT, ...)          (retryable_transport)
```

### 3.2 错误流转示意

```
错误产生
  ↓
classifyError(error) → ErrorHandlingMeta
  ↓
┌── meta.isRetryable=true ──→ invokeWithRetry(meta)   // REQ-7040
├── meta.recommendedAction=switch_provider → 模型切换  // REQ-7041
├── meta.recommendedAction=require_user_config → 提示用户
└── meta.recommendedAction=require_human_intervention → 停止并报错
```

## 4. 接口设计

### 4.1 导出接口

```typescript
// 主入口
export function classifyError(error: unknown): ErrorHandlingMeta;

// 查询接口
export function isErrorRetryable(error: unknown): boolean;
export function getErrorCategory(error: unknown): ErrorCategory;
export function getErrorSeverity(error: unknown): ErrorSeverity;

// 映射表（供测试和扩展使用）
export const ERROR_HANDLING_MAP: Record<ErrorCategory, ErrorHandlingMeta>;
```

### 4.2 与 REQ-7040 的集成点

REQ-7040 的 `isRetryableError` 函数可以替换为：

```typescript
import { isErrorRetryable } from './errorClassifier';

// 在 retryHandler.ts 中
function isRetryableError(error: any): boolean {
  return isErrorRetryable(error);
}
```

## 5. 实现步骤

### Phase 1: 核心分类逻辑（0.25天）

1. 创建 `server/src/llm/errorClassifier.ts`
2. 定义 `ErrorCategory`、`ErrorSeverity`、`RecommendedAction` 类型
3. 实现 `ERROR_HANDLING_MAP` 映射表
4. 实现 `classifyError()` 入口函数
5. 实现子分类函数（`classifyFromStructuredOutputCategory`、`classifyFromHttpStatus`、`classifyFromNetworkCode`）

### Phase 2: 导出接口 + 测试（0.25天）

1. 实现便捷查询函数（`isErrorRetryable`、`getErrorCategory`、`getErrorSeverity`）
2. 编写单元测试（覆盖所有分类、边界用例）
3. 验证现有测试不被破坏

## 6. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 分类不准确 | 处理策略错误 | 中 | 保守兜底到 system_error |
| 与现有 errorHandler 冲突 | 重复提示 | 低 | 分类器提供数据，UI 决定展示 |
| 过度设计 | 增加维护负担 | 低 | 仅覆盖已知场景，YAGNI |

## 7. 测试计划

### 7.1 单元测试

```typescript
describe('classifyError', () => {
  // StructuredOutputErrorCategory 映射
  it('maps transport_error to retryable_transport', () => {});
  it('maps unsupported_native_json to strategy_fallback', () => {});
  it('maps thinking_pollution to output_parse_error', () => {});
  it('maps incomplete_json to output_parse_error', () => {});
  it('maps schema_mismatch to strategy_fallback', () => {});

  // HTTP 状态码映射
  it('maps HTTP 429 to rate_limited', () => {});
  it('maps HTTP 401 to auth_error', () => {});
  it('maps HTTP 403 to auth_error', () => {});
  it('maps HTTP 400 to invalid_request', () => {});
  it('maps HTTP 502 to retryable_transport', () => {});
  it('maps HTTP 503 to retryable_transport', () => {});
  it('maps HTTP 504 to retryable_transport', () => {});

  // 网络错误码映射
  it('maps ECONNRESET to retryable_transport', () => {});
  it('maps ETIMEDOUT to retryable_transport', () => {});
  it('maps ENOTFOUND to retryable_transport', () => {});

  // 安全兜底
  it('falls back to system_error for unknown errors', () => {});
  it('falls back to system_error for null/undefined', () => {});

  // 便捷函数
  it('isErrorRetryable returns true for retryable errors', () => {});
  it('isErrorRetryable returns false for auth errors', () => {});
});
```

## 8. 交付物

- [ ] `server/src/llm/errorClassifier.ts` — 错误分类器
- [ ] `server/tests/llm/errorClassifier.test.ts` — 单元测试
- [ ] 文档更新（README.md 状态同步）
