---
description: "REQ-7042: 错误分类器 — 需求文档（工作副本）"
update_time: "2026-07-11"
status: todo
---

# REQ-7042: 错误分类器

## 1. 需求背景

### 1.1 问题描述

当前系统的错误处理存在两层分离的问题：

1. **结构化输出层**（`structuredOutput.ts`）定义了 `StructuredOutputErrorCategory`，用于分类 LLM 输出格式错误（unsupported_native_json、thinking_pollution、incomplete_json 等），但该分类仅服务于策略降级决策，不覆盖传输层和业务层错误。
2. **错误处理中间件**（`errorHandler.ts`）处理 HTTP 错误时依赖正则匹配和字符串嗅探，缺乏统一的错误分类体系。

两层之间没有统一的"错误应该怎样处理"的决策层——网络超时、429 限流、认证失败、策略降级失败等不同类型的错误，各自用不同的 if/else 路径处理，逻辑分散且难以维护。

### 1.2 现状分析

**已有功能**：
- `StructuredOutputErrorCategory` — 6 种结构化输出错误分类（unsupported_native_json / thinking_pollution / incomplete_json / malformed_json / schema_mismatch / transport_error）
- `classifyStructuredOutputFailure()` — 基于关键词嗅探将错误映射到上述分类
- `errorHandler.ts` 中的 `formatLlmUpstreamError()` — 基于 HTTP 状态码的用户提示
- `structuredInvoke.ts` 中的策略降级链 — 根据分类决定使用哪种 Structured Output 策略

**缺失功能**：
- ❌ 统一的错误处理策略映射（错误分类 → 处理动作）
- ❌ 错误严重度分级（可忽略 / 可重试 / 需降级 / 需人工介入）
- ❌ 跨层错误信息传递（从底层错误到顶层决策缺乏统一数据结构）
- ❌ 可恢复性的显式判断（哪些错误自动处理，哪些需要用户介入）

### 1.3 目标用户

系统内部开发者和运维人员——错误分类器是基础设施层，为上层的自动重试（REQ-7040）、模型备用切换（REQ-7041）、自动导演流水线提供统一的错误决策依据。

## 2. 需求定义

### 2.1 功能需求

#### FR-1: 统一错误分类体系

**描述**：定义一个全局错误分类类型，覆盖所有 LLM 调用和系统处理中可能遇到的错误类别。

**分类枚举**：

| 分类 | 含义 | 可恢复 | 处理策略 |
|------|------|--------|----------|
| `retryable_transport` | 网络超时、502/503/504 等瞬态传输错误 | 是 | 自动重试 |
| `rate_limited` | 429 限流 | 是 | 等待 + 重试 |
| `auth_error` | 401/403 认证失败 | 否 | 需人工配置 |
| `invalid_request` | 400 请求格式错误 | 否 | 需人工排查 |
| `strategy_fallback` | 策略降级后的格式兼容错误（对应现有 StructuredOutputError 中的非 transport 类别） | 部分 | 切换 Provider 或降级策略 |
| `model_unavailable` | 模型服务不可用（超时、下线） | 部分 | 切换 Provider |
| `output_parse_error` | 输出解析失败（JSON 格式错误、Schema 不匹配） | 部分 | 重试或策略降级 |
| `system_error` | 系统内部错误（内存溢出、数据库异常等） | 否 | 需人工介入 |

**验收标准**：
- [ ] 定义 `ErrorCategory` 类型，包含上述所有分类
- [ ] 每个分类关联 `isRetryable` / `severity` / `recommendedAction` 元数据
- [ ] 分类覆盖 `StructuredOutputErrorCategory` 的所有现有值

#### FR-2: 错误分类映射表

**描述**：提供从各种错误源（HTTP 状态码、网络错误码、StructuredOutputErrorCategory、自定义错误类）到统一 `ErrorCategory` 的映射。

**映射规则**：

| 输入源 | 映射规则 | 目标分类 |
|--------|----------|----------|
| HTTP 429 | Retry-After 存在 → rate_limited | `rate_limited` |
| HTTP 401/403 | — | `auth_error` |
| HTTP 400 | — | `invalid_request` |
| HTTP 502/503/504 | — | `retryable_transport` |
| ECONNRESET/ETIMEDOUT/ENOTFOUND | — | `retryable_transport` |
| StructuredOutputErrorCategory: transport_error | — | `retryable_transport` |
| StructuredOutputErrorCategory: unsupported_native_json | — | `strategy_fallback` |
| StructuredOutputErrorCategory: thinking_pollution | — | `output_parse_error` |
| StructuredOutputErrorCategory: incomplete_json / malformed_json | — | `output_parse_error` |
| StructuredOutputErrorCategory: schema_mismatch | — | `strategy_fallback` |
| 内存溢出 / OOM | — | `system_error` |

**验收标准**：
- [ ] `classifyError(error)` 函数能处理 Error / StructuredOutputError / HTTP 响应对象
- [ ] 返回结构包含 `category`、`severity`、`isRetryable`、`recommendedAction`
- [ ] 无法识别的错误归类为 `system_error`（安全兜底）

#### FR-3: 错误处理策略元数据

**描述**：每个错误分类附带处理策略元数据，供上层（重试器、备用切换、UI 展示）直接消费。

**元数据结构**：

```typescript
interface ErrorHandlingMeta {
  category: ErrorCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isRetryable: boolean;
  recommendedAction:
    | 'retry_with_backoff'
    | 'wait_and_retry'
    | 'switch_provider'
    | 'degrade_strategy'
    | 'require_user_config'
    | 'require_human_intervention';
  userMessage?: string;  // 面向用户的提示信息
}
```

**验收标准**：
- [ ] 每个分类都有完整的元数据
- [ ] `userMessage` 使用中文，从用户视角说明功能
- [ ] 与 `errorHandler.ts` 中现有的 `formatLlmUpstreamError` 逻辑对齐

#### FR-4: 向后兼容

**描述**：错误分类器与现有 `StructuredOutputErrorCategory` 向后兼容，不破坏现有调用链。

**规则**：
- 现有 `StructuredOutputErrorCategory` 类型保留，不修改
- `classifyStructuredOutputFailure()` 保持现有行为
- 新增 `classifyError()` 作为上层统一入口
- `StructuredOutputError` 可选携带 `ErrorHandlingMeta`

**验收标准**：
- [ ] 现有 `structuredInvoke.ts` 代码无需修改即可编译通过
- [ ] 现有测试全部通过
- [ ] 新增分类器是纯增量变更

### 2.2 非功能需求

#### NFR-1: 性能

- 错误分类逻辑为纯函数，无 I/O 操作
- 分类耗时 <1ms

#### NFR-2: 可测试性

- 每个映射规则可独立单元测试
- 分类函数无副作用，易于 mock

#### NFR-3: 可维护性

- 新增错误分类只需在映射表中添加条目
- 分类枚举和元数据集中管理，不散落在多个文件中

## 3. 技术约束

### 3.1 架构约束

- 必须在 `server/src/llm/` 目录下实现（与现有 structuredOutput.ts 同层）
- 不修改 `StructuredOutputErrorCategory` 类型定义
- 不修改 `classifyStructuredOutputFailure()` 函数逻辑

### 3.2 依赖约束

- 依赖：REQ-7040（API 失败自动重试）— 错误分类器为重试器提供可重试判断
- 被依赖：REQ-7041（模型备用切换）、REQ-7043（网络监控）

### 3.3 数据约束

- 错误分类为纯内存计算，不涉及数据库存储
- 分类元数据可序列化为 JSON（用于日志和监控）

## 4. 验收标准

### 4.1 功能验收

- [ ] 所有已知错误源都有对应的分类映射
- [ ] 未知错误安全兜底为 `system_error`
- [ ] 现有 `StructuredOutputErrorCategory` 不被修改
- [ ] 现有代码无需修改即可编译通过

### 4.2 测试验收

- [ ] 单元测试覆盖率 >80%
- [ ] 每种错误分类至少有一个测试用例
- [ ] 边界用例覆盖（空错误、未知错误、嵌套错误）

### 4.3 兼容性验收

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过（现有测试不被破坏）

## 5. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 分类不准确 | 重试/降级决策错误 | 中 | 保守兜底策略 + 单元测试覆盖 |
| 与现有 errorHandler 冲突 | 错误提示重复或矛盾 | 低 | 错误分类器提供结构化数据，由 UI 层决定展示 |
| 过度分类 | 新分类无人使用 | 低 | 从实际需求出发，仅覆盖已知场景 |

## 6. 工作量评估

- **开发时间**：0.5天
- **测试时间**：0.5天
- **总计**：1天

## 7. 优先级

**P1** - 高优先级

**理由**：
- 是 v0.2 流程自动化的基础设施
- 为 REQ-7040（重试）和 REQ-7041（备用切换）提供统一决策依据
- 技术风险低，改动范围可控
