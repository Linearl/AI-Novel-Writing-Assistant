---
description: "质量修复阶段调试日志保存 — 设计文档"
reqId: REQ-2021
created: 2026-06-28
---

# REQ-2021 设计文档

## 1. 架构概览

```
server/src/
  config/
    directorDebug.ts          ← 新增: DIRECTOR_DEBUG_LOG_ENABLED 配置读取
  services/novel/director/
    automation/
      novelDirectorAutoExecutionCircuitBreakerRuntime.ts
        └── stopAutoExecutionForCircuitBreaker()  ← 修改: 在函数体内调用日志保存
    debug/
      directorDebugLogger.ts  ← 新增: 调试日志保存服务（纯函数模块）

server/logs/
  director-debug/             ← 新增: 运行时生成的调试日志目录
    2026-06-28T10-30-00Z_task-abc123.json
    ...
```

## 2. 日志文件格式

```json
{
  "timestamp": "2026-06-28T10:30:00.000Z",
  "taskId": "task-uuid-here",
  "novelId": "novel-uuid-here",
  "chapterId": "chapter-uuid-or-null",
  "autoExecution": {
    "isBackgroundRunning": false,
    "nextChapterId": "...",
    "remainingChapterIds": ["..."],
    "completedChapterCount": 3,
    "qualityDebtChapterIds": [],
    "qualityDebtSummaries": [],
    "qualityLoopLedger": { ... },
    "qualityRepairRisk": { ... }
  },
  "circuitBreaker": {
    "status": "open",
    "reason": "auto_repair_exhausted",
    "message": "Patch failure threshold reached (3/3)",
    "openedAt": "2026-06-28T10:29:55.000Z",
    "chapterId": "...",
    "chapterOrder": 5,
    "failureCount": 3,
    "patchFailureCount": 3,
    "replanLoopCount": 0,
    "modelFailureCount": 0,
    "usageAnomalyCount": 0,
    "recoveryAction": "manual_repair"
  },
  "recentLlmUsage": [],
  "errorStack": null,
  "config": {
    "patchFailureOpenAt": 3,
    "replanLoopOpenAt": 3,
    "modelFailureOpenAt": 3,
    "usageAnomalyOpenAt": 2
  }
}
```

### 字段说明

| 字段 | 来源 | 说明 |
|------|------|------|
| `timestamp` | `new Date().toISOString()` | 写入时间 |
| `taskId` | `input.taskId` | 当前任务 ID |
| `novelId` | `input.novelId` | 小说 ID |
| `chapterId` | `input.circuitBreaker.chapterId` | 触发断路器时的章节 ID |
| `autoExecution` | `input.autoExecution` | 完整状态快照（结构化克隆） |
| `circuitBreaker` | `input.circuitBreaker` | 断路器状态快照 |
| `recentLlmUsage` | 从 autoExecution 上下文提取 | 最近 LLM 使用记录（最多 10 条） |
| `errorStack` | 调用上下文传入或 null | 错误堆栈（如有） |
| `config` | `DIRECTOR_CIRCUIT_BREAKER_THRESHOLDS` | 当前阈值配置（辅助分析） |

## 3. 日志保存函数设计

```typescript
// server/src/services/novel/director/debug/directorDebugLogger.ts

import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DEBUG_LOG_DIR = "server/logs/director-debug";
const MAX_LOG_FILES = 100;

interface DirectorDebugLogEntry {
  timestamp: string;
  taskId: string;
  novelId: string;
  chapterId: string | null;
  autoExecution: unknown;
  circuitBreaker: unknown;
  recentLlmUsage: unknown[];
  errorStack: string | null;
  config: typeof DIRECTOR_CIRCUIT_BREAKER_THRESHOLDS;
}

/**
 * 保存导演断路器调试日志到磁盘。
 * fire-and-forget 调用: 写入失败静默忽略，不阻塞调用方。
 */
export async function saveDirectorDebugLog(
  entry: DirectorDebugLogEntry,
): Promise<void> {
  try {
    await mkdir(DEBUG_LOG_DIR, { recursive: true });
    const filename = `${entry.timestamp.replace(/[:.]/g, "-")}_${entry.taskId}.json`;
    const filePath = join(DEBUG_LOG_DIR, filename);
    await writeFile(filePath, JSON.stringify(entry, null, 2), "utf-8");
    await enforceMaxLogFiles();
  } catch {
    // 静默忽略: 不中断断路器停止流程
  }
}

async function enforceMaxLogFiles(): Promise<void> {
  try {
    const files = await readdir(DEBUG_LOG_DIR);
    if (files.length <= MAX_LOG_FILES) return;
    const sorted = files.sort();
    const toDelete = sorted.slice(0, files.length - MAX_LOG_FILES);
    await Promise.all(toDelete.map((f) => unlink(join(DEBUG_LOG_DIR, f))));
  } catch {
    // 静默忽略
  }
}
```

## 4. 配置模块设计

```typescript
// server/src/config/directorDebug.ts

/**
 * 读取 DIRECTOR_DEBUG_LOG_ENABLED 环境变量。
 * 未设置或设为 "true" 时返回 true（默认开启）。
 */
export function isDirectorDebugLogEnabled(): boolean {
  const value = process.env.DIRECTOR_DEBUG_LOG_ENABLED?.toLowerCase();
  if (value === undefined || value === "") return true;
  return value === "true" || value === "1";
}
```

## 5. 集成点

在 `stopAutoExecutionForCircuitBreaker` 函数体内，**在现有逻辑之后**（不改变现有执行顺序），添加：

```typescript
// novelDirectorAutoExecutionCircuitBreakerRuntime.ts
// 在 stopAutoExecutionForCircuitBreaker 函数末尾

if (isDirectorDebugLogEnabled()) {
  // fire-and-forget: 不 await
  saveDirectorDebugLog({
    timestamp: new Date().toISOString(),
    taskId: input.taskId,
    novelId: input.novelId,
    chapterId: input.circuitBreaker.chapterId ?? null,
    autoExecution: structuredClone(input.autoExecution),
    circuitBreaker: structuredClone(input.circuitBreaker),
    recentLlmUsage: [], // TODO: 从运行时上下文提取
    errorStack: null,
    config: DIRECTOR_CIRCUIT_BREAKER_THRESHOLDS,
  }).catch(() => {});
}
```

## 6. 关键决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 日志格式 | JSON | 便于程序化分析和 grep 检索 |
| 文件命名 | `{timestamp}_{taskId}.json` | 时间排序 + 任务关联 + UUID 保证唯一 |
| 写入方式 | fire-and-forget（不 await） | 不增加断路器停止延迟，I/O 失败无影响 |
| 清理策略 | 写入后检查 + 按文件名排序删除 | 简单可靠，无需定时器或后台任务 |
| 配置默认值 | 开启 | 调试日志仅在本地开发环境产生，生产环境可关闭 |
| `recentLlmUsage` | 首版传空数组，预留字段 | 当前 autoExecution 类型中无 LLM usage 记录字段，后续迭代补充 |

## 7. 实施顺序

1. 新增 `server/src/config/directorDebug.ts`
2. 新增 `server/src/services/novel/director/debug/directorDebugLogger.ts`
3. 修改 `novelDirectorAutoExecutionCircuitBreakerRuntime.ts` 集成调用
4. 添加单元测试
5. 更新 `.gitignore` 忽略 `server/logs/`
