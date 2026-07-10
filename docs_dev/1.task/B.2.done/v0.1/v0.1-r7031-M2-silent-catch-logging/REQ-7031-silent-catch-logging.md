---
description: "静默吞错日志化 — REQ-7031 需求文档，修复审计复核确认的 .catch(() => {}) 静默吞错点共 14 处"
---

# REQ-7031：静默吞错日志化

## 背景

2026-07-01 代码审计-full 独有发现复核报告中，稳定性维度确认了 **14 处 `.catch(() => {})` 静默吞错**和 **2 处 ReadStream 资源泄漏**。全量审计已解决一轮其他问题，这些是被遗漏的条目。

所有条目的修复方案均明确：**在 catch 块中添加结构化日志**，不改变异常传播行为（保持非阻断语义），仅提升可观测性。

## 范围

### 优先修复（P2 级，3 处）

| 来源 ID | 文件 | 当前代码 | 修复方案 |
|---------|------|----------|----------|
| STA-021 | `server/src/services/novel/novelCoreReviewService.ts:140` | `.catch(() => null)` — 审计后重规划触发静默失败 | `.catch((err) => { logger.error('Failed to trigger replan after audit', { novelId, chapterId, error: err }); return null; })` |
| STA-009 | `server/src/modules/novel/characters/http/novelCharacterSyncRoutes.ts:82` | `.catch(() => null)` — 角色导入后动态重建静默失败 | `.catch((err) => { logger.error('Failed to rebuild dynamics after import', { novelId, error: err }); return null; })` + HTTP 响应 warn |

### 常规修复（P3 级，9 处）

| 来源 ID | 文件 | 修复 |
|---------|------|------|
| STA-004 | `server/src/llm/usageTracking.ts:312` | `.catch((err) => logger.warn('Failed to track token usage', { error: err }))` |
| STA-007 | `server/src/services/novel/novelCorePipelineService.ts:530` | `.catch((err) => logger.error('[pipeline] background execution failed', { jobId, novelId, error: err }))` |
| STA-008 | `server/src/services/novel/volume/NovelVolumeService.ts:148` | `.catch((err) => logger.warn('Event emit failed', { event: 'volume:updated', novelId, error: err }))` |
| STA-011 | `server/src/services/novel/novelCoreSupport.ts:6` | `.catch((err) => logger.warn('RAG enqueueUpsert failed', { ownerType, ownerId, error: err }))` |
| STA-013 | `server/src/services/novel/novelCorePipelineExecutor.ts:520` | `.catch((err) => logger.warn('Event emit failed', { event: 'pipeline:completed', novelId, jobId, error: err }))` |
| STA-014 | `server/src/services/novel/director/automation/novelDirectorAutoExecutionCircuitBreakerRuntime.ts:160` | `.catch((err) => logger.warn('Failed to write circuit breaker debug detail', { taskId, novelId, error: err }))` |
| STA-022 | `server/src/services/state/StateService.ts:480` | `.catch((err) => logger.warn('Failed to sync state diff conflicts', { novelId, chapterId, error: err }))` |
| STA-024 | `server/src/prompting/core/promptRunner.ts:386` | `.catch((err) => logger.warn('Failed to capture completed usage', { assetId, error: err }))` |
| STA-023 | `server/src/services/task/RecoveryTaskService.ts:335` | 已有 logger.error，补充恢复失败任务重新入队逻辑（可选，当前标记为低优先级） |

### 资源泄漏修复（P3 级，2 处）

| 来源 ID | 文件 | 修复 |
|---------|------|------|
| STA-001 | `server/src/services/logging/logQueryService.ts:101` | for await 循环包裹 try-finally，finally 中 `fileStream.destroy()` |
| STA-002 | `server/src/services/novel/novelPromptTraceReport.ts:121` | 同上 |

### 流错误处理（P4 级，1 处）

| 来源 ID | 文件 | 修复 |
|---------|------|------|
| STA-018 | `server/src/modules/drama/http/dramaRoutes.ts:608` | createReadStream 添加 `.on('error', handler)` ，三处 pipe 同步修复 |

## 验收标准

- [ ] 所有 14 处 catch 块均添加了结构化日志（logger.warn 或 logger.error）
- [ ] 日志包含上下文信息（文件/novelId/taskId 等关键标识）
- [ ] 不改变原有异常传播行为（仍不抛出、不阻断主流程）
- [ ] 2 处 ReadStream 添加了 try-finally 或 stream.destroy()
- [ ] 3 处 createReadStream.pipe 添加了 error 事件处理
- [ ] `pnpm typecheck` 通过
- [ ] `pnpm test` 通过

## 不计入范围

- 不做重试逻辑（仅加日志）
- 不改动事件总线本身的 emit 行为
- 不改动 LoggerService 的实现

## 参考

- 复核报告：`docs_dev/3.analysis/diagnosis/01-active/2026-07-01-代码审计-full/复核报告-独有发现.md`
- 来源审计：`docs_dev/3.analysis/diagnosis/01-active/2026-07-01-代码审计-full/` 下各 JSON 文件
