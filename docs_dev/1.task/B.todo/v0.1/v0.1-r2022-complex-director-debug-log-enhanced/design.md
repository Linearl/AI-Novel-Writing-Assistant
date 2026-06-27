---
description: "REQ-2022 质量修复阶段调试日志增强 — 设计文档"
reqId: REQ-2022
created: 2026-06-28
---

# REQ-2022 设计文档

## 1. 方案概述

在 REQ-2021 的断路器快照框架基础上，构建完整的调试数据采集管道：内存缓冲区实时记录 LLM 调用历史、章节内容演变和修复过程，在断路器触发时批量序列化为磁盘 JSON。采用按 taskId 隔离的缓冲区实例、三级详细级别控制、fire-and-forget 写入策略。

### 1.1 设计目标

1. 最小侵入 REQ-2021 已有框架，扩展而非替换
2. 零主流程性能影响（异步缓冲 + fire-and-forget）
3. 按需级别控制，在调试能力和存储开销间取得平衡
4. 支持并发任务，缓冲区按 taskId 隔离

### 1.2 关键决策

1. **决策点 1**：扩展 `DirectorDebugLogEntry` 接口（而非新建独立模块）— 原因：REQ-2021 已建立日志条目结构和写入管道，在其基础上扩展字段是最小变更路径
2. **决策点 2**：使用内存环形缓冲区（而非直接写入临时文件）— 原因：内存访问延迟远低于磁盘 I/O，50 条 LLM 调用记录的内存占用可控（约 5-10MB），适合 fire-and-forget 场景
3. **决策点 3**：配置开关在 `directorDebug.ts` 中统一管理 — 原因：REQ-2021 已有该配置模块，新增字段保持配置读取集中化

### 1.3 不在范围

- 实时日志流式推送（WebSocket/SSE）
- 日志的 Web UI 查看界面
- 数据库事件日志（`DirectorAutomationLedgerEventService`）行为修改
- 断路器状态机逻辑或阈值修改

## 2. 架构设计

### 2.1 日志文件分离策略

**核心设计**：将调试日志分为两个文件，简要日志引用详细日志的相对路径。

```
server/logs/director-debug/
├── 2026-06-28T10-30-00Z_task-abc123_brief.json    ← 简要日志（状态快照 + 引用路径）
├── 2026-06-28T10-30-00Z_task-abc123_detail.json   ← 详细日志（完整 LLM 调用历史等）
└── ...
```

**简要日志**（`_brief.json`）：
- 包含 REQ-2021 的基础字段（autoExecution、circuitBreaker、config）
- 新增 `detailLogPath` 字段，指向详细日志的相对路径
- 文件大小小（通常 <50KB），便于快速浏览和筛选

**详细日志**（`_detail.json`）：
- 包含完整的 LLM 调用历史、章节内容演变、修复过程
- 文件可能较大（可达数 MB），仅在需要深入分析时读取
- 通过简要日志的 `detailLogPath` 字段关联

### 2.2 模块结构

```
server/src/
  config/
    directorDebug.ts                    ← 扩展: 新增 detailLevel / retentionHours 配置
  services/novel/director/
    debug/
      directorDebugLogger.ts            ← 扩展: 分离 brief/detail 两个写入函数
      directorDebugBuffer.ts            ← 新增: 内存缓冲区管理器
      directorDebugTypes.ts             ← 新增: 调试数据类型定义
    automation/
      novelDirectorAutoExecutionCircuitBreakerRuntime.ts
        └── stopAutoExecutionForCircuitBreaker()  ← 修改: 批量写入 brief + detail
    quality/
      (质量修复流程相关文件)              ← 修改: 在关键节点注入调试数据采集调用

server/logs/
  director-debug/                       ← 已有: 运行时生成的调试日志目录
    2026-06-28T10-30-00Z_task-abc123_brief.json   ← 简要日志
    2026-06-28T10-30-00Z_task-abc123_detail.json  ← 详细日志
    ...
```

### 2.3 数据流

```
质量修复流程中的关键调用点
        │
        ▼
┌─────────────────────────┐
│  DirectorDebugBuffer    │  (按 taskId 隔离的内存环形缓冲区)
│  - llmCallHistory[50]   │
│  - contentSnapshots[]   │
│  - repairAttempts[]     │
│  - auditResults[]       │
└──────────┬──────────────┘
           │ 断路器触发时 flush
           ▼
┌─────────────────────────┐
│  saveDirectorDebugBrief()│  (写入简要日志)
│  - 基础状态快照          │
│  - detailLogPath 引用    │  ← 指向详细日志的相对路径
└──────────┬──────────────┘
           │ fire-and-forget
           ▼
┌─────────────────────────┐
│  saveDirectorDebugDetail()│  (写入详细日志)
│  - 完整 LLM 调用历史     │
│  - 章节内容演变          │
│  - 修复过程记录          │
└──────────┬──────────────┘
           │ fire-and-forget
           ▼
    server/logs/director-debug/
    ├── *_brief.json   ← 简要日志（快速浏览）
    └── *_detail.json  ← 详细日志（深入分析）
```

## 3. 类型定义

### 3.1 调试数据类型（`directorDebugTypes.ts`）

```typescript
/** LLM 调用记录 */
export interface DirectorDebugLlmCall {
  timestamp: string;
  prompt: string;              // 根据 detailLevel 截断或完整
  completion: string;          // 根据 detailLevel 截断或完整
  toolCalls: Array<{
    toolName: string;
    args: unknown;
    result: unknown;
  }>;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  durationMs: number;
}

/** 章节内容快照 */
export interface DirectorDebugContentSnapshot {
  nodeType: "draft" | "repair" | "acceptance";
  content: string;
  reason: string;
  timestamp: string;
  chapterVersion?: number;
}

/** 修复尝试记录 */
export interface DirectorDebugRepairAttempt {
  strategy: string;
  inputSummary: string;        // 修复前内容摘要
  outputSummary: string;       // 修复后内容摘要
  success: boolean;
  failureReason?: string;
  timestamp: string;
  durationMs: number;
}

/** 审计结果记录 */
export interface DirectorDebugAuditResult {
  passed: boolean;
  issues: Array<{
    code: string;
    message: string;
    severity: "error" | "warning" | "info";
  }>;
  timestamp: string;
  durationMs: number;
}
```

### 3.2 扩展日志条目

**简要日志条目**（`DirectorDebugBriefLogEntry`）：

```typescript
export interface DirectorDebugBriefLogEntry {
  // === REQ-2021 已有字段 ===
  timestamp: string;
  taskId: string;
  novelId: string;
  chapterId: string | null;
  autoExecution: unknown;
  circuitBreaker: unknown;
  recentLlmUsage: unknown[];
  errorStack: string | null;
  config: unknown;

  // === REQ-2022 新增字段 ===
  detailLogPath: string;       // 详细日志的相对路径，如 "./2026-06-28T10-30-00Z_task-abc123_detail.json"
  detailLevel: "minimal" | "standard" | "verbose";
  
  // 摘要信息（便于快速筛选）
  summary: {
    totalLlmCalls: number;     // LLM 调用总次数
    totalTokens: number;       // Token 总消耗
    repairAttempts: number;    // 修复尝试次数
    lastAuditPassed: boolean;  // 最后一次审计是否通过
  };
}
```

**详细日志条目**（`DirectorDebugDetailLogEntry`）：

```typescript
export interface DirectorDebugDetailLogEntry {
  // 基础信息
  timestamp: string;
  taskId: string;
  novelId: string;
  chapterId: string | null;
  detailLevel: "minimal" | "standard" | "verbose";

  // 完整的 LLM 调用历史
  llmCallHistory: DirectorDebugLlmCall[];

  // 章节内容演变历史
  contentSnapshots: DirectorDebugContentSnapshot[];

  // 修复尝试记录
  repairAttempts: DirectorDebugRepairAttempt[];

  // 审计结果记录
  auditResults: DirectorDebugAuditResult[];
}
```

## 4. 内存缓冲区设计（`directorDebugBuffer.ts`）

### 4.1 核心类

```typescript
class DirectorDebugBuffer {
  private buffers: Map<string, {
    llmCalls: DirectorDebugLlmCall[];
    contentSnapshots: DirectorDebugContentSnapshot[];
    repairAttempts: DirectorDebugRepairAttempt[];
    auditResults: DirectorDebugAuditResult[];
  }>;

  /** 记录 LLM 调用（环形缓冲，上限 50） */
  recordLlmCall(taskId: string, call: DirectorDebugLlmCall): void;

  /** 记录章节内容快照 */
  recordContentSnapshot(taskId: string, snapshot: DirectorDebugContentSnapshot): void;

  /** 记录修复尝试 */
  recordRepairAttempt(taskId: string, attempt: DirectorDebugRepairAttempt): void;

  /** 记录审计结果 */
  recordAuditResult(taskId: string, result: DirectorDebugAuditResult): void;

  /** 提取并清空指定 taskId 的所有缓冲数据 */
  flush(taskId: string): DebugBufferSnapshot | null;

  /** 修复成功时清空指定章节的缓冲数据 */
  discardOnSuccess(taskId: string): void;
}
```

### 4.2 环形缓冲策略

- LLM 调用历史：最多 50 条，超出时 `shift()` 最早的记录
- 内容快照、修复尝试、审计结果：无硬上限，但单个章节的修复周期内通常不超过 20 条
- `flush()` 后清空对应 taskId 的所有缓冲区

### 4.3 全局单例

```typescript
// 导出全局单例，供整个 director 模块共享
export const directorDebugBuffer = new DirectorDebugBuffer();
```

## 5. 配置扩展

在 REQ-2021 的 `directorDebug.ts` 基础上新增：

```typescript
export type DirectorDebugDetailLevel = "minimal" | "standard" | "verbose";

/** 获取调试日志详细级别 */
export function getDirectorDebugDetailLevel(): DirectorDebugDetailLevel {
  const value = process.env.DIRECTOR_DEBUG_LOG_DETAIL_LEVEL?.toLowerCase();
  if (value === "minimal" || value === "verbose") return value;
  return "standard"; // 默认
}

/** 获取调试日志保留时间（小时） */
export function getDirectorDebugRetentionHours(): number {
  const value = parseInt(process.env.DIRECTOR_DEBUG_LOG_RETENTION_HOURS ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : 168; // 默认 7 天
}
```

## 6. 日志写入扩展

### 6.1 分离写入函数

**简要日志写入**（`saveDirectorDebugBrief`）：

```typescript
/**
 * 写入简要日志文件（*_brief.json）
 * 包含基础状态快照 + 详细日志的相对路径引用
 */
export async function saveDirectorDebugBrief(
  entry: DirectorDebugBriefLogEntry,
  logDir: string,
): Promise<string> {  // 返回详细日志的文件名
  const timestamp = entry.timestamp.replace(/[:.]/g, "-");
  const briefFilename = `${timestamp}_${entry.taskId}_brief.json`;
  const detailFilename = `${timestamp}_${entry.taskId}_detail.json`;
  
  // 写入简要日志
  const briefPath = join(logDir, briefFilename);
  await writeFile(briefPath, JSON.stringify({
    ...entry,
    detailLogPath: `./${detailFilename}`,  // 相对路径引用
  }, null, 2), "utf-8");
  
  return detailFilename;  // 返回给调用方用于写入详细日志
}
```

**详细日志写入**（`saveDirectorDebugDetail`）：

```typescript
/**
 * 写入详细日志文件（*_detail.json）
 * 包含完整的 LLM 调用历史、章节内容演变、修复过程
 */
export async function saveDirectorDebugDetail(
  entry: DirectorDebugDetailLogEntry,
  logDir: string,
  filename: string,  // 由 saveDirectorDebugBrief 返回
): Promise<void> {
  const filePath = join(logDir, filename);
  await writeFile(filePath, JSON.stringify(entry, null, 2), "utf-8");
}
```

### 6.2 文件格式示例

**简要日志**（`*_brief.json`）：

```json
{
  "timestamp": "2026-06-28T10:30:00.000Z",
  "taskId": "task-uuid",
  "novelId": "novel-uuid",
  "chapterId": "chapter-uuid",
  "detailLevel": "standard",
  "detailLogPath": "./2026-06-28T10-30-00Z_task-uuid_detail.json",

  "autoExecution": { "...快照..." },
  "circuitBreaker": { "...快照..." },
  "config": { "...阈值配置..." },

  "summary": {
    "totalLlmCalls": 15,
    "totalTokens": 89312,
    "repairAttempts": 3,
    "lastAuditPassed": false
  }
}
```

**详细日志**（`*_detail.json`）：

```json
{
  "timestamp": "2026-06-28T10:30:00.000Z",
  "taskId": "task-uuid",
  "novelId": "novel-uuid",
  "chapterId": "chapter-uuid",
  "detailLevel": "standard",

  "llmCallHistory": [
    {
      "timestamp": "...",
      "prompt": "请根据以下大纲生成...",
      "completion": "第一章 风起...",
      "toolCalls": [{ "toolName": "chapter_generator", "args": {}, "result": {} }],
      "tokenUsage": { "promptTokens": 1500, "completionTokens": 2000, "totalTokens": 3500 },
      "durationMs": 3200
    }
  ],

  "contentSnapshots": [
    {
      "nodeType": "draft",
      "content": "...章节内容...",
      "reason": "初始生成",
      "timestamp": "...",
      "chapterVersion": 1
    }
  ],

  "repairAttempts": [
    {
      "strategy": "dialogue_consistency_fix",
      "inputSummary": "角色A的对话与前文矛盾...",
      "outputSummary": "修正了角色A的对话...",
      "success": false,
      "failureReason": "修复后仍存在时间线矛盾",
      "timestamp": "...",
      "durationMs": 5000
    }
  ],

  "auditResults": [
    {
      "passed": false,
      "issues": [
        { "code": "DIALOGUE_INCONSISTENCY", "message": "角色A第3段对话与第1段矛盾", "severity": "error" }
      ],
      "timestamp": "...",
      "durationMs": 2000
    }
  ]
}
```

### 6.2 detailLevel 对 LLM 记录的影响

| 级别 | prompt | completion | toolCalls | tokenUsage | durationMs |
|------|--------|------------|-----------|------------|------------|
| minimal | 不记录 | 不记录 | 不记录 | 记录 | 记录 |
| standard | 前 500 字符 | 前 500 字符 | 完整记录 | 记录 | 记录 |
| verbose | 完整记录（上限 100KB） | 完整记录（上限 100KB） | 完整记录 | 记录 | 记录 |

### 6.3 保留时间清理

在 `saveDirectorDebugLog` 写入完成后，检查目录中所有文件的修改时间，删除超过 `retentionHours` 的文件：

```typescript
async function enforceRetention(): Promise<void> {
  const retentionMs = getDirectorDebugRetentionHours() * 3600 * 1000;
  const now = Date.now();
  const files = await readdir(DEBUG_LOG_DIR);
  for (const file of files) {
    const stat = await stat(join(DEBUG_LOG_DIR, file));
    if (now - stat.mtimeMs > retentionMs) {
      await unlink(join(DEBUG_LOG_DIR, file)).catch(() => {});
    }
  }
}
```

## 7. 集成点

### 7.1 缓冲区采集点

在质量修复流程的关键节点注入采集调用：

| 采集点 | 调用方法 | 位置 |
|--------|---------|------|
| LLM 调用完成 | `directorDebugBuffer.recordLlmCall(taskId, call)` | LLM structured invoke wrapper 或调用方 |
| 章节 draft 完成 | `directorDebugBuffer.recordContentSnapshot(taskId, snapshot)` | 章节生成完成后 |
| 修复开始/结束 | `directorDebugBuffer.recordRepairAttempt(taskId, attempt)` | 质量修复循环中 |
| 审计完成 | `directorDebugBuffer.recordAuditResult(taskId, result)` | 章节审计完成后 |
| 修复成功 | `directorDebugBuffer.discardOnSuccess(taskId)` | chapterStatus -> completed 时 |

### 7.2 断路器触发写入

扩展 `stopAutoExecutionForCircuitBreaker`，分离写入 brief 和 detail：

```typescript
if (isDirectorDebugLogEnabled()) {
  const buffered = directorDebugBuffer.flush(input.taskId);
  const logDir = "server/logs/director-debug";
  
  // 1. 写入简要日志，获取详细日志的文件名
  const detailFilename = await saveDirectorDebugBrief({
    timestamp: new Date().toISOString(),
    taskId: input.taskId,
    novelId: input.novelId,
    chapterId: input.circuitBreaker.chapterId ?? null,
    autoExecution: structuredClone(input.autoExecution),
    circuitBreaker: structuredClone(input.circuitBreaker),
    recentLlmUsage: [],
    errorStack: null,
    config: DIRECTOR_CIRCUIT_BREAKER_THRESHOLDS,
    detailLevel: getDirectorDebugDetailLevel(),
    summary: {
      totalLlmCalls: buffered?.llmCalls.length ?? 0,
      totalTokens: buffered?.llmCalls.reduce((sum, call) => sum + call.tokenUsage.totalTokens, 0) ?? 0,
      repairAttempts: buffered?.repairAttempts.length ?? 0,
      lastAuditPassed: buffered?.auditResults[buffered.auditResults.length - 1]?.passed ?? false,
    },
  }, logDir).catch(() => null);
  
  // 2. 写入详细日志（如果有数据且获取到文件名）
  if (detailFilename && buffered) {
    await saveDirectorDebugDetail({
      timestamp: new Date().toISOString(),
      taskId: input.taskId,
      novelId: input.novelId,
      chapterId: input.circuitBreaker.chapterId ?? null,
      detailLevel: getDirectorDebugDetailLevel(),
      llmCallHistory: buffered.llmCalls,
      contentSnapshots: buffered.contentSnapshots,
      repairAttempts: buffered.repairAttempts,
      auditResults: buffered.auditResults,
    }, logDir, detailFilename).catch(() => {});
  }
}
```

## 8. 异常处理

| 场景 | 处理方式 |
|------|----------|
| 缓冲区 flush 时对应 taskId 无数据 | 返回空数组，不报错 |
| LLM 调用记录内容超大（>100KB） | 按 detailLevel 截断或丢弃 |
| 并发 flush 同一 taskId | flush 为原子操作（取出并清空），不产生竞争 |
| 目录写入失败 | 静默忽略（与 REQ-2021 一致） |

## 9. 验证策略

1. 构建 shared：`pnpm --filter @ai-novel/shared build`
2. 类型检查：`pnpm typecheck`
3. 单元测试：`pnpm test`
4. 测试覆盖：
   - 缓冲区记录/flush/discard 基本路径
   - 环形缓冲区溢出行为
   - detailLevel 对 LLM 记录内容的影响
   - 保留时间清理逻辑
   - 配置开关禁用时无内存开销
