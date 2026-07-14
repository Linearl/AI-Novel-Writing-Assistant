---
reqId: 7062
title: "LLM 基础设施增强 — 需求文档（工作副本）"
status: requirements_ready
priority: P2
complexity: S1
estimatedEffort: "2天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7062: LLM 基础设施增强

## 1. 需求背景

### 1.1 问题描述

当前 LLM 调用层存在以下基础设施缺口：
- 缺少 Token 用量追踪，无法统计 API 消耗和成本
- 请求限制器配置变更后需重启服务才能生效
- Prompt 执行过程中无法追踪 Token 分布
- 章节验收状态枚举不规范，存在硬编码字符串

### 1.2 现状分析

**已有功能**：
- `structuredInvoke` — LLM 结构化调用
- `requestLimiter` — 基础请求限流
- 章节验收 prompt — 基本审校流程

**缺失功能**：
- ❌ Token 用量追踪（无数据采集、无持久化、无查询接口）
- ❌ 请求限制器热重载（配置变更需重启）
- ❌ Prompt 执行级 Token 追踪（无 per-prompt 统计）
- ❌ 验收状态规范化（硬编码字符串散布多处）

### 1.3 目标用户

开发者和运维人员（成本监控、性能分析），以及系统自身（热重载配置）。

## 2. 需求定义

### 2.1 功能需求

#### FR-1: Token 用量追踪

**描述**：在 LLM 调用层采集每次调用的 Token 用量，通过 AsyncLocalStorage 在请求链路中传播，最终持久化到数据库。

**数据模型**：
```typescript
interface LlmTokenUsageSnapshot {
  id: string;
  novelId: string;
  chapterId?: string;
  promptName: string;          // PromptAsset 名称
  provider: string;            // LLM Provider
  model: string;               // 模型名称
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costEstimate?: number;       // 成本估算（美元）
  latencyMs: number;
  createdAt: string;
}
```

**传播机制**：
- 使用 Node.js `AsyncLocalStorage` 在调用链路中传播追踪上下文
- 每次 LLM 调用自动采集 Token 用量
- 调用完成后推送到持久化队列

**持久化**：
- 异步写入 SQLite/PostgreSQL
- 批量写入减少 IO 开销

**验收标准**：
- [ ] 每次 LLM 调用自动采集 Token 用量
- [ ] AsyncLocalStorage 在调用链路中正确传播
- [ ] 用量数据持久化到数据库
- [ ] 提供查询 API（按 novelId、时间范围、provider 等维度）
- [ ] 支持批量写入（减少 DB IO）

**上游参考**：
- `server/src/llm/usageTracking.ts` — 412 行

#### FR-2: 请求限制器热重载

**描述**：请求限制器配置变更后无需重启服务即可生效。

**实现方式**：
- `evictSharedLimiters()` 函数清除已缓存的限制器实例
- 下次请求时根据最新配置重新创建限制器
- 支持通过 API 触发热重载

**验收标准**：
- [ ] `evictSharedLimiters()` 清除所有缓存限制器
- [ ] 热重载后新请求使用新配置
- [ ] 进行中的请求不受影响
- [ ] 提供 API 接口触发热重载

**上游参考**：
- `server/src/llm/requestLimiter.ts` — 164 行

#### FR-3: Prompt 执行级 Token 追踪

**描述**：在 Prompt 执行层面追踪 Token 分布，记录每个 PromptAsset 的执行 Token 消耗。

**实现方式**：
- 在 `invokeStructuredLlm` 中集成 Token 采集
- 每次 Prompt 执行后记录 input/output tokens
- 关联到具体的 PromptAsset 名称

**验收标准**：
- [ ] 每次 Prompt 执行记录 Token 用量
- [ ] Token 数据关联到 PromptAsset 名称
- [ ] 支持按 PromptAsset 聚合查询

**上游参考**：
- `server/src/llm/structuredInvoke.ts` — 439 行

#### FR-4: 验收状态规范化

**描述**：将散布在多处的章节验收状态硬编码字符串收敛为统一的枚举类型。

**规范化内容**：
```typescript
// 统一验收状态枚举
type AcceptanceStatus =
  | "pending"           // 待审核
  | "auto_approved"     // 自动通过
  | "user_approved"     // 用户通过
  | "revision_required" // 需修订
  | "rejected";         // 拒绝
```

**验收标准**：
- [ ] 定义统一的 `AcceptanceStatus` 枚举
- [ ] 替换所有硬编码字符串
- [ ] `normalizeAcceptanceStatus()` 函数处理旧数据兼容
- [ ] Prisma schema 使用枚举类型

**上游参考**：
- `server/src/prompting/prompts/novel/chapterAcceptance.prompts.ts` — 356 行

### 2.2 非功能需求

#### NFR-1: 性能

- Token 采集不应显著增加 LLM 调用延迟（< 1ms 开销）
- 批量写入间隔不超过 30 秒
- AsyncLocalStorage 传播开销可忽略

#### NFR-2: 可靠性

- Token 数据丢失不影响 LLM 调用主流程
- 批量写入失败时数据暂存内存，下次重试
- 热重载不中断进行中的请求

#### NFR-3: 可观测性

- Token 用量可通过 API 查询
- 支持按 novelId、provider、promptName 维度聚合
- 成本估算支持按 provider 配置单价

## 3. 技术约束

### 3.1 架构约束

- Token 追踪基于 AsyncLocalStorage（Node.js 内置）
- 持久化使用现有 Prisma ORM
- 热重载基于模块缓存清除

### 3.2 依赖约束

- 无前置依赖
- 新增 Prisma 模型 `LlmTokenUsage`（需 migration）

### 3.3 数据约束

- Token 用量数据按 novelId 分区
- 保留策略：默认 90 天，可配置
- 单条记录 < 1KB

## 4. 验收标准

### 4.1 功能验收

- [ ] Token 用量自动采集和持久化
- [ ] 请求限制器热重载生效
- [ ] Prompt 级 Token 追踪可用
- [ ] 验收状态枚举统一

### 4.2 性能验收

- [ ] Token 采集开销 < 1ms
- [ ] 批量写入不阻塞 LLM 调用
- [ ] 查询 API 响应 < 200ms

### 4.3 测试验收

- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试通过
- [ ] typecheck 通过

## 5. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| AsyncLocalStorage 性能开销 | LLM 调用延迟增加 | 低 | 实测开销 < 1ms |
| 批量写入数据丢失 | Token 数据不完整 | 低 | 内存缓冲 + 重试 |
| Prisma migration 影响 | 数据库 schema 变更 | 低 | 向前兼容 migration |
| 热重载竞态条件 | 限制器状态不一致 | 中 | 进行中请求使用旧配置 |

## 6. 工作量评估

- **开发时间**：1.5 天
- **测试时间**：0.5 天
- **总计**：2 天

## 7. 优先级

**P2** — 中优先级

**理由**：
- Token 用量追踪是成本管理的基础
- 请求限制器热重载提升运维效率
- 验收状态规范化是代码质量改进
- 不影响核心功能，可独立推进
