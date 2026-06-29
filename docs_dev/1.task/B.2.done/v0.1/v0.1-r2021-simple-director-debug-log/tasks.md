---
description: "质量修复阶段调试日志保存 — 任务拆解"
reqId: REQ-2021
created: 2026-06-28
---

# REQ-2021 任务清单

## 任务清单

| # | 任务 | 优先级 | 涉及文件 | 状态 |
| - | ---- | ------ | -------- | ---- |
| T1 | 实现调试日志保存函数 | P1 | `server/src/services/novel/director/debug/directorDebugLogger.ts` | ✅ |
| T2 | 实现配置开关模块 | P1 | `server/src/config/directorDebug.ts` | ✅ |
| T3 | 在 stopAutoExecutionForCircuitBreaker 中集成日志保存 | P1 | `server/src/services/novel/director/automation/novelDirectorAutoExecutionCircuitBreakerRuntime.ts` | ✅ |
| T4 | 更新 .gitignore 忽略 server/logs/ | P2 | `.gitignore` | ✅ |
| T5 | 编写单元测试 | P1 | `server/tests/directorDebugLogger.test.js` | ✅ |
| T6 | 验证全仓库类型检查 | P1 | - | ✅ |

---

## T1. 实现调试日志保存函数

**目标**：创建 `directorDebugLogger.ts`，提供 `saveDirectorDebugLog` 函数，将调试上下文序列化为 JSON 写入磁盘，并在超过 100 个文件时自动清理最旧文件。

**操作**：
- 新建 `server/src/services/novel/director/debug/directorDebugLogger.ts`
- 实现 `DirectorDebugLogEntry` 接口（timestamp, taskId, novelId, chapterId, autoExecution, circuitBreaker, recentLlmUsage, errorStack, config）
- 实现 `saveDirectorDebugLog(entry)` 函数：mkdir -p + writeFile + enforceMaxLogFiles
- 实现 `enforceMaxLogFiles()` 私有函数：readdir + sort + slice + unlink
- 全部 I/O 错误静默 catch

---

## T2. 实现配置开关模块

**目标**：创建 `directorDebug.ts`，提供 `isDirectorDebugLogEnabled()` 函数，从 `DIRECTOR_DEBUG_LOG_ENABLED` 环境变量读取配置。

**操作**：
- 新建 `server/src/config/directorDebug.ts`
- 读取 `process.env.DIRECTOR_DEBUG_LOG_ENABLED`
- 未设置或空值默认返回 `true`（开启）
- 仅 `"true"` 或 `"1"` 返回 `true`，其余返回 `false`

---

## T3. 在 stopAutoExecutionForCircuitBreaker 中集成日志保存

**目标**：在断路器停止函数末尾调用 `saveDirectorDebugLog`，fire-and-forget 模式，不阻塞现有流程。

**操作**：
- 修改 `server/src/services/novel/director/automation/novelDirectorAutoExecutionCircuitBreakerRuntime.ts`
- 在 `stopAutoExecutionForCircuitBreaker` 函数末尾添加条件调用
- 使用 `if (isDirectorDebugLogEnabled())` 守卫
- fire-and-forget: `saveDirectorDebugLog(entry).catch(() => {})`
- `recentLlmUsage` 首版传空数组 `[]`
- `errorStack` 首版传 `null`（预留字段）

---

## T4. 更新 .gitignore

**目标**：将 `server/logs/` 加入 `.gitignore`，避免调试日志文件被提交到版本控制。

**操作**：
- 在项目根目录 `.gitignore` 中添加 `server/logs/` 条目

---

## T5. 编写单元测试

**目标**：验证日志保存函数的正常路径、开关关闭路径、自动清理路径。

**操作**：
- 新建 `server/tests/directorDebugLogger.test.ts`
- 测试用例 1: 正常保存 — 调用后磁盘存在对应 JSON 文件，内容字段完整
- 测试用例 2: 自动清理 — 创建 102 个文件后调用，保留最近 100 个
- 测试用例 3: 目录不存在时自动创建
- 测试用例 4: 写入失败时静默忽略（mock fs 抛错）
- 使用 Node.js 内置 test runner（`node:test` + `node:assert`）
- 使用 `node:fs/promises` + `node:os` + `node:path` 创建临时目录隔离测试

---

## T6. 验证全仓库类型检查

**目标**：确保所有新增/修改文件无 TypeScript 类型错误。

**操作**：
- 运行 `pnpm typecheck` 确认无新增错误

---

## DoD（Definition of Done）

- [x] `saveDirectorDebugLog` 函数正常工作，写入完整 JSON 文件
- [x] `isDirectorDebugLogEnabled` 开关正确控制功能启停
- [x] `stopAutoExecutionForCircuitBreaker` 集成点正确，fire-and-forget 不阻塞
- [x] 超过 100 个文件自动清理最旧文件
- [x] 日志写入失败静默忽略，不中断断路器流程
- [x] 单元测试覆盖正常/关闭/清理/错误路径
- [x] `pnpm typecheck` 无新增错误
- [x] `server/logs/` 已加入 `.gitignore`
