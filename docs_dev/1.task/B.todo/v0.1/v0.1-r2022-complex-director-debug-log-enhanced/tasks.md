---
description: "REQ-2022 质量修复阶段调试日志增强 — 任务拆解"
reqId: REQ-2022
created: 2026-06-28
---

# REQ-2022 任务清单

## 任务清单

| # | 任务 | 优先级 | 涉及文件 | 状态 |
| - | ---- | ------ | -------- | ---- |
| T1 | 定义调试数据类型 | P0 | `server/src/services/novel/director/debug/directorDebugTypes.ts` | ⬜ 待开始 |
| T2 | 扩展配置模块 | P0 | `server/src/config/directorDebug.ts` | ⬜ 待开始 |
| T3 | 实现内存缓冲区管理器 | P0 | `server/src/services/novel/director/debug/directorDebugBuffer.ts` | ⬜ 待开始 |
| T4 | 扩展日志保存函数 | P0 | `server/src/services/novel/director/debug/directorDebugLogger.ts` | ⬜ 待开始 |
| T5 | 扩展断路器集成点 | P0 | `server/src/services/novel/director/automation/novelDirectorAutoExecutionCircuitBreakerRuntime.ts` | ⬜ 待开始 |
| T6 | 在质量修复流程中注入采集点 | P0 | 质量修复流程相关文件 | ⬜ 待开始 |
| T7 | 实现保留时间清理 | P1 | `server/src/services/novel/director/debug/directorDebugLogger.ts` | ⬜ 待开始 |
| T8 | 编写单元测试 | P1 | `server/tests/directorDebugBuffer.test.ts`, `server/tests/directorDebugLogger.test.ts` | ⬜ 待开始 |
| T9 | 验证全仓库类型检查 | P1 | - | ⬜ 待开始 |

---

## T1. 定义调试数据类型

**目标**：创建 `directorDebugTypes.ts`，定义 LLM 调用记录、章节内容快照、修复尝试记录、审计结果记录的 TypeScript 接口。

**操作**：
- 新建 `server/src/services/novel/director/debug/directorDebugTypes.ts`
- 定义 `DirectorDebugLlmCall` 接口（timestamp, prompt, completion, toolCalls, tokenUsage, durationMs）
- 定义 `DirectorDebugContentSnapshot` 接口（nodeType, content, reason, timestamp, chapterVersion）
- 定义 `DirectorDebugRepairAttempt` 接口（strategy, inputSummary, outputSummary, success, failureReason, timestamp, durationMs）
- 定义 `DirectorDebugAuditResult` 接口（passed, issues, timestamp, durationMs）
- 定义 `DirectorDebugBufferSnapshot` 接口（汇总 flush 输出）
- 扩展 `DirectorDebugLogEntry` 接口，新增 llmCallHistory / contentSnapshots / repairAttempts / auditResults / detailLevel 字段

---

## T2. 扩展配置模块

**目标**：在现有 `directorDebug.ts` 中新增 `detailLevel` 和 `retentionHours` 配置读取函数。

**操作**：
- 修改 `server/src/config/directorDebug.ts`
- 新增 `getDirectorDebugDetailLevel()` 函数，读取 `DIRECTOR_DEBUG_LOG_DETAIL_LEVEL` 环境变量
- 新增 `getDirectorDebugRetentionHours()` 函数，读取 `DIRECTOR_DEBUG_LOG_RETENTION_HOURS` 环境变量
- 默认值：detailLevel = "standard"，retentionHours = 168

---

## T3. 实现内存缓冲区管理器

**目标**：创建 `directorDebugBuffer.ts`，提供按 taskId 隔离的环形缓冲区，支持记录和 flush 操作。

**操作**：
- 新建 `server/src/services/novel/director/debug/directorDebugBuffer.ts`
- 实现 `DirectorDebugBuffer` 类：
  - `recordLlmCall(taskId, call)` — 环形缓冲，上限 50 条
  - `recordContentSnapshot(taskId, snapshot)` — 追加记录
  - `recordRepairAttempt(taskId, attempt)` — 追加记录
  - `recordAuditResult(taskId, result)` — 追加记录
  - `flush(taskId)` — 原子取出并清空所有缓冲数据，返回 `DirectorDebugBufferSnapshot`
  - `discardOnSuccess(taskId)` — 清空指定 taskId 的所有缓冲数据
- 导出全局单例 `directorDebugBuffer`
- 内部使用 `Map<string, BufferState>` 结构，key 为 taskId

---

## T4. 扩展日志保存函数（支持文件分离）

**目标**：重构日志保存函数，支持简要日志和详细日志分离存储。

**操作**：
- 修改 `server/src/services/novel/director/debug/directorDebugLogger.ts`
- 新增 `DirectorDebugBriefLogEntry` 接口（包含 detailLogPath、summary 字段）
- 新增 `DirectorDebugDetailLogEntry` 接口（包含 llmCallHistory、contentSnapshots 等）
- 实现 `saveDirectorDebugBrief(entry, logDir)` 函数：
  - 写入简要日志文件（`*_brief.json`）
  - 生成详细日志文件名（相同时间戳 + taskId + `_detail.json`）
  - 返回详细日志文件名供调用方使用
- 实现 `saveDirectorDebugDetail(entry, logDir, filename)` 函数：
  - 写入详细日志文件（`*_detail.json`）
- 在写入完成后调用 `enforceRetention()`
- 新增 `enforceRetention()` 私有函数：检查文件 mtime，删除超过 retentionHours 的文件
- 原子写入：先写临时文件（`.tmp` 后缀），再 `rename` 替换目标文件

---

## T5. 扩展断路器集成点（支持文件分离）

**目标**：在 `stopAutoExecutionForCircuitBreaker` 中 flush 缓冲区数据，分离写入简要日志和详细日志。

**操作**：
- 修改 `server/src/services/novel/director/automation/novelDirectorAutoExecutionCircuitBreakerRuntime.ts`
- 在断路器触发时调用 `directorDebugBuffer.flush(taskId)` 获取缓冲数据
- 调用 `saveDirectorDebugBrief` 写入简要日志，获取详细日志文件名
- 调用 `saveDirectorDebugDetail` 写入详细日志（使用返回的文件名）
- 简要日志包含：
  - REQ-2021 已有字段（autoExecution、circuitBreaker、config）
  - `detailLogPath`：指向详细日志的相对路径
  - `summary`：LLM 调用次数、token 消耗、修复尝试次数等统计
  - `detailLevel`：当前配置的详细级别
- 详细日志包含：
  - `llmCallHistory`：完整的 LLM 调用历史
  - `contentSnapshots`：章节内容演变
  - `repairAttempts`：修复尝试记录
  - `auditResults`：审计结果
- 保持 fire-and-forget 模式不变

---

## T6. 在质量修复流程中注入采集点

**目标**：在质量修复流程的关键节点调用缓冲区的记录方法。

**操作**：
- 定位质量修复流程中的关键节点（需先探索现有代码确认具体文件和函数）：
  - LLM structured invoke 调用处 → 注入 `recordLlmCall`
  - 章节 draft 生成完成后 → 注入 `recordContentSnapshot`
  - 修复循环开始/结束 → 注入 `recordRepairAttempt`
  - 章节审计完成后 → 注入 `recordAuditResult`
  - 章节状态变为 completed → 注入 `discardOnSuccess`
- 所有注入点需用 `isDirectorDebugLogEnabled()` 守卫
- 所有注入为 fire-and-forget，不修改主流程返回值

---

## T7. 实现保留时间清理

**目标**：在每次写入新日志后，自动删除超过保留时间的旧日志文件。

**操作**：
- 已在 T4 中实现 `enforceRetention()` 函数
- T7 独立验证：创建测试用例验证保留时间清理逻辑
- 注意：T4 和 T7 共享同一实现，T7 侧重测试验证

---

## T8. 编写单元测试

**目标**：验证缓冲区管理、配置读取、日志写入、文件分离、保留时间清理的正确性。

**操作**：
- 新建 `server/tests/directorDebugBuffer.test.ts`：
  - 测试用例 1: recordLlmCall 基本记录和 flush
  - 测试用例 2: 环形缓冲区溢出（超过 50 条时丢弃最早记录）
  - 测试用例 3: flush 后清空缓冲区
  - 测试用例 4: discardOnSuccess 清空指定 taskId
  - 测试用例 5: 多个 taskId 隔离
  - 测试用例 6: recordContentSnapshot / recordRepairAttempt / recordAuditResult 基本路径
- 新建或扩展 `server/tests/directorDebugLogger.test.ts`：
  - 测试用例 7: detailLevel=minimal 时 LLM 记录不含 prompt/completion
  - 测试用例 8: detailLevel=standard 时 LLM 记录含截断 prompt/completion
  - 测试用例 9: detailLevel=verbose 时 LLM 记录含完整 prompt/completion
  - 测试用例 10: 保留时间清理——创建超期文件后调用写入，验证过期文件被删除
  - 测试用例 11: getDirectorDebugDetailLevel 默认值
  - 测试用例 12: getDirectorDebugRetentionHours 默认值
  - **测试用例 13: 文件分离——验证简要日志和详细日志分别生成，且简要日志包含 detailLogPath**
  - **测试用例 14: 简要日志 summary 统计正确性**
  - **测试用例 15: 详细日志文件名与简要日志引用一致**
- 使用 Node.js 内置 test runner（`node:test` + `node:assert`）
- 使用 `node:os` + `node:path` 创建临时目录隔离测试

---

## T9. 验证全仓库类型检查

**目标**：确保所有新增/修改文件无 TypeScript 类型错误。

**操作**：
- 运行 `pnpm typecheck` 确认无新增错误

---

## DoD（Definition of Done）

- [ ] `DirectorDebugBuffer` 环形缓冲区工作正常，50 条上限生效
- [ ] LLM 调用历史、章节内容快照、修复尝试、审计结果均可记录到缓冲区
- [ ] flush 操作原子性正确，多 taskId 隔离正确
- [ ] detailLevel 三级配置正确控制 LLM 记录内容
- [ ] 断路器触发时生成两个 JSON 文件：简要日志（`*_brief.json`）和详细日志（`*_detail.json`）
- [ ] 简要日志包含 `detailLogPath` 字段，指向详细日志的相对路径
- [ ] 简要日志包含 `summary` 字段，统计信息正确
- [ ] 详细日志包含 llmCallHistory、contentSnapshots、repairAttempts、auditResults 字段
- [ ] 修复成功后缓冲区数据被正确丢弃
- [ ] 保留时间清理功能正常工作
- [ ] `DIRECTOR_DEBUG_LOG_ENABLED=false` 时无额外开销
- [ ] 单元测试覆盖所有核心路径（含文件分离测试）
- [ ] `pnpm typecheck` 无新增错误

---

## 依赖

- 前置依赖：REQ-2021（`saveDirectorDebugLog`、`isDirectorDebugLogEnabled`、`directorDebug.ts` 已实现）
- 关联依赖：无
- 后继依赖：无

---

## 执行记录

| 日期 | 任务 | 状态 |
| ---- | ---- | ---- |
| 2026-06-28 | 创建任务包 | 完成 |

---

## 完成判定

- T1~T9 全部完成且 DoD 全部满足后，REQ-2022 达到"已完成"状态。
