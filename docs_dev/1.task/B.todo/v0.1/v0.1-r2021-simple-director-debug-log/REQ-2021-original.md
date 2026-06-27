---
description: "小说项目风险管理系统 — 原始需求冻结副本"
frozenAt: 2026-06-28
---

# REQ-2021 — 质量修复阶段调试日志保存（原始需求）

> 本文件为原始需求冻结副本，由 `ll-workflow-core / req` 路由受理时自动生成。
> 工作副本见 [REQ-2021.md](./REQ-2021.md)。

## 用户原始输入

1. auto-director 在质量修复阶段发生异常时，只在数据库中保存了简要的错误摘要，缺少详细的调试信息
2. 无法事后重现问题场景，给调试带来困难
3. 需要在断路器触发时（stopAutoExecutionForCircuitBreaker），保存完整的调试上下文到磁盘
4. 日志应包含：时间戳、任务ID、小说ID、章节ID、autoExecution 状态快照、circuitBreaker 状态、最近的 LLM 使用记录、错误堆栈
5. 日志保存位置：`server/logs/director-debug/` 目录，JSON 格式
6. 添加配置开关：`DIRECTOR_DEBUG_LOG_ENABLED`（默认开启）
7. 保留最近 100 个调试日志文件，自动清理旧文件

## 环境上下文

- 项目: AI 小说创作工作台（pnpm monorepo）
- 断路器触发入口: `stopAutoExecutionForCircuitBreaker`（`server/src/services/novel/director/automation/novelDirectorAutoExecutionCircuitBreakerRuntime.ts:72-117`）
- 断路器状态类型: `DirectorCircuitBreakerState`（`shared/types/novelDirector.ts:122-139`）
- 自动执行状态类型: `DirectorAutoExecutionState`（`shared/types/novelDirector.ts:254-285`）
- 环境配置模式: 各模块独立 `process.env` 读取（`server/src/config/` 下按功能分文件）
- 当前无 `server/logs/` 目录，无 `DIRECTOR_DEBUG` 相关配置
- 事件日志已有 `DirectorAutomationLedgerEventService`（数据库持久化），本次新增的是磁盘文件日志
