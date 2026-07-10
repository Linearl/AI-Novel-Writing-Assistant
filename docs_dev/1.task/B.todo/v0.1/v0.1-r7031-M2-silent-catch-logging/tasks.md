---
description: "静默吞错日志化 — REQ-7031 任务拆解"
---

# REQ-7031 任务拆解

## 阶段一：P2 优先修复（3 项）

- [ ] **T1.1** STA-021: `novelCoreReviewService.ts:140` — catch 加 logger.error + 标记 replan 状态
  - 文件：`server/src/services/novel/novelCoreReviewService.ts`
  - 验证：review 对象中 replanTriggered 字段值正确；logger.error 在 replan 失败时触发
- [ ] **T1.2** STA-009: `novelCharacterSyncRoutes.ts:82` — catch 加 logger.error + HTTP warn
  - 文件：`server/src/modules/novel/characters/http/novelCharacterSyncRoutes.ts`
  - 验证：rebuildDynamics 失败时日志输出 + 响应中包含 warning 字段
- [ ] **T1.3** STA-023: `RecoveryTaskService.ts:335` — 已有 logger，确认无误
  - 仅确认代码现状，不做改动

## 阶段二：P3 批量日志化（9 项）

- [ ] **T2.1** STA-004: `usageTracking.ts:312` — 3 处 `.catch(() => null)` → logger.warn
- [ ] **T2.2** STA-007: `novelCorePipelineService.ts:530` — 后台执行 catch → logger.error
- [ ] **T2.3** STA-008: `NovelVolumeService.ts:148` — 事件发射 catch → logger.warn
- [ ] **T2.4** STA-011: `novelCoreSupport.ts:6-14` — 2 处 RAG 索引 catch → logger.warn
- [ ] **T2.5** STA-013: `novelCorePipelineExecutor.ts:520` — 事件发射 catch → logger.warn
- [ ] **T2.6** STA-014: `novelDirectorAutoExecutionCircuitBreakerRuntime.ts:160` → logger.warn
- [ ] **T2.7** STA-022: `StateService.ts:480` → logger.warn
- [ ] **T2.8** STA-024: `promptRunner.ts:386` → logger.warn
- [ ] **T2.9** 全量搜索 `server/src/` 确认无遗漏的 `.catch(() => {})` 模式（不含明确有注释说明的）

## 阶段三：资源泄漏修复（3 项）

- [ ] **T3.1** STA-001: `logQueryService.ts:101` — for await 加 try-finally + fileStream.destroy()
- [ ] **T3.2** STA-002: `novelPromptTraceReport.ts:121` — 同上
- [ ] **T3.3** STA-018: `dramaRoutes.ts:608/626/646` — 3 处 pipe 加 `.on('error', handler)`

## 阶段四：验证

- [ ] **T4.1** `pnpm typecheck` 通过
- [ ] **T4.2** `pnpm test` 通过
- [ ] **T4.3** 抽查 3 个修改文件确认日志格式一致
