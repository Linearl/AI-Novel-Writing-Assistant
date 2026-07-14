---
reqId: 7062
title: "LLM 基础设施增强 — 任务清单"
status: requirements_ready
priority: P2
complexity: S1
estimatedEffort: "2天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7062: LLM 基础设施增强 — 任务清单

## 阶段零：需求就绪

- [x] 需求文档完成
- [x] 技术设计完成
- [x] 任务清单完成
- [x] 决策日志完成

## 阶段一：FR-1 Token 用量追踪（1 天）

> 参照上游 `server/src/llm/usageTracking.ts`（412 行）

- [ ] T1: 分析上游 `usageTracking.ts` 实现（AsyncLocalStorage + 批量写入）（0.1 天）
- [ ] T2: Prisma schema 新增 `LlmTokenUsage` 模型（0.1 天）
- [ ] T3: 执行 `prisma migrate dev` 生成 migration（0.05 天）
- [ ] T4: 实现 `usageTracking.ts`（AsyncLocalStorage + UsageTracker 类）（0.2 天）
- [ ] T5: 在 `structuredInvoke.ts` 中集成 Token 追踪（0.15 天）
- [ ] T6: 实现 Token 用量查询 API（0.1 天）
- [ ] T7: 验收：手动调用 LLM 后查询 Token 数据（0.1 天）
- [ ] T8: 编写 UsageTracker 单元测试（0.1 天）

## 阶段二：FR-2 请求限制器热重载（0.3 天）

> 参照上游 `server/src/llm/requestLimiter.ts`（164 行）

- [ ] T9: 分析上游 `requestLimiter.ts` 的缓存机制（0.05 天）
- [ ] T10: 实现 `evictSharedLimiters()` 函数（0.1 天）
- [ ] T11: 添加热重载 API 路由（0.05 天）
- [ ] T12: 验收：热重载后限制器配置变更生效（0.05 天）
- [ ] T13: 编写热重载单元测试（0.05 天）

## 阶段三：FR-3 Prompt 执行级追踪（0.2 天）

> 参照上游 `server/src/llm/structuredInvoke.ts`（439 行）

- [ ] T14: 在 `structuredInvoke` 中包裹 `usageTrackingStorage.run()`（0.1 天）
- [ ] T15: 错误场景也记录延迟数据（0.05 天）
- [ ] T16: 验收：按 PromptAsset 名称聚合查询 Token 用量（0.05 天）

## 阶段四：FR-4 验收状态规范化（0.2 天）

> 参照上游 `server/src/prompting/prompts/novel/chapterAcceptance.prompts.ts`（356 行）

- [ ] T17: 定义 `AcceptanceStatus` 枚举类型（0.02 天）
- [ ] T18: 实现 `normalizeAcceptanceStatus()` 函数（0.05 天）
- [ ] T19: 全项目搜索并替换硬编码验收状态字符串（0.1 天）
- [ ] T20: 编写 normalizeAcceptanceStatus 单元测试（0.03 天）

## 阶段五：验证与测试（0.3 天）

- [ ] T21: typecheck 全量验证（0.05 天）
- [ ] T22: pnpm test 全量验证（0.1 天）
- [ ] T23: Prisma migration 验证（0.05 天）
- [ ] T24: 手动验证 Token 追踪端到端流程（0.1 天）

## 阶段六：收尾

- [ ] T25: 更新 requirements.md
- [ ] T26: 更新任务包 README 状态
- [ ] T27: 更新 run_result.json 状态
- [ ] T28: 提交变更

## 完成标准

- [ ] 所有任务完成
- [ ] Token 用量自动采集和持久化
- [ ] 请求限制器热重载生效
- [ ] 验收状态枚举统一
- [ ] typecheck 通过
- [ ] 测试覆盖率 > 80%
