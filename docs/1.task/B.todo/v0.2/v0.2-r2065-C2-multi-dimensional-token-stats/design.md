---
description: "REQ-2065 多维度 Token 统计功能 — 技术设计"
---

# REQ-2065 技术设计

## 1. 架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                     数据采集层 (Phase 1)                         │
│                                                                 │
│  LLM 调用 ──factory.ts monkey-patch──▶ extractLlmTokenUsage()  │
│       │                                        │                │
│       ▼                                        ▼                │
│  runWithLlmUsageTracking()          recordTrackedLlmUsage()     │
│  (AsyncLocalStorage)                      │                     │
│       │                    ┌──────────────┼──────────────┐       │
│       │                    ▼              ▼              ▼       │
│                  LlmTokenUsage   NovelWorkflowTask  GenerationJob│
│                  (含 stepType)    (计数器保留)      (计数器保留)  │
│                                                                 │
│  注入点：                                                        │
│  - AgentRuntime.start() 包裹 planning + tool execution          │
│  - chat.ts 包裹对话 streaming                                    │
│  - character 服务包裹角色相关调用                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     查询聚合层 (Phase 2)                         │
│                                                                 │
│  novelTokenUsageSummary.ts ──改查──▶ LlmTokenUsage GROUP BY     │
│  novelTokenUsageByStep.ts  ──新增──▶ LlmTokenUsage GROUP BY step│
│                                                                 │
│  API: GET /api/novels/:novelId/token-stats                      │
│  → { total, byStep: [{ stepType, tokens, percentage }] }        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     前端展示层 (Phase 3)                         │
│                                                                 │
│  CreativeHubSidebar                                             │
│    └── CreativeHubTokenStatsPanel (新增)                         │
│         ├── 总量卡片组 (累计Token/调用次数/平均消耗)               │
│         └── 步骤占比饼图 (recharts PieChart)                     │
└─────────────────────────────────────────────────────────────────┘
```

## 2. 数据模型变更

### 2.1 Prisma Schema

```prisma
model LlmTokenUsage {
  id           String   @id @default(cuid())
  novelId      String
  chapterId    String?
  promptName   String
  stepType     String?  // ← 新增：draft|repair|review|outline|planning|style|chat|tool|character
  provider     String
  model        String
  inputTokens  Int
  outputTokens Int
  totalTokens  Int
  latencyMs    Int      @default(0)
  status       String   @default("recorded")
  metadataJson String?
  recordedAt   DateTime

  @@index([novelId, recordedAt])
  @@index([novelId, stepType, recordedAt])  // ← 新增复合索引
  @@index([provider, recordedAt])
  @@index([promptName, recordedAt])
  @@index([recordedAt])
}
```

### 2.2 stepType 枚举设计

| 值 | 含义 | 来源场景 |
|---|---|---|
| `draft` | 章节撰写 | auto-director 生成节点 |
| `repair` | 章节修复 | 修复流程节点 |
| `review` | 审校/质量检查 | 质量循环节点 |
| `outline` | 大纲生成 | 大纲规划节点 |
| `planning` | 全局规划 | Director/Agent planner |
| `style` | 风格提取 | styleExtraction |
| `chat` | 对话交互 | Creative Hub 普通对话 |
| `tool` | 工具调用 | Creative Hub agent tool |
| `character` | 角色相关 | 角色补充/一致性检测 |

## 3. 核心改动设计

### 3.1 守卫逻辑放宽

**文件**: `server/src/llm/usageTracking.ts` line 288-292

```typescript
// Before: only workflowTask/generationJob/styleExtraction/directorTelemetry can pass
if (!context?.workflowTaskId && !context?.generationJobId) {
  if (!context?.styleExtractionTaskId && context?.directorTelemetry !== true) {
    return;
  }
}

// After: novelId alone can pass
if (!context?.novelId && !context?.workflowTaskId && !context?.generationJobId) {
  if (!context?.styleExtractionTaskId && context?.directorTelemetry !== true) {
    return;
  }
}
```

**风险分析**：新增的 `novelId` 通过守卫后，所有有 novelId 的 LLM 调用都会写入 `LlmTokenUsage`。由于 creative hub 路径的 LLM 调用目前完全不记录，这是纯增量，不会造成重复计数。

### 3.2 context 传播

```typescript
// usageTracking.ts
export interface LlmUsageTrackingContext {
  // 现有字段...
  stepType?: string | null;  // 新增
}

// runWithLlmUsageTracking merge 增加 stepType
stepType: mergeContextValue(current?.stepType, context.stepType),
```

### 3.3 Creative Hub 注入

**AgentRuntime.ts** line 148（规划阶段）:
```typescript
planner = await runWithLlmUsageTracking(
  { novelId: input.novelId, stepType: "planning" },
  () => createStructuredPlan({...}),
);
```

**AgentRuntime.ts** line 206（工具执行阶段）:
```typescript
return runWithLlmUsageTracking(
  { novelId: input.novelId, stepType: "tool" },
  () => this.executor.runActionPlan(run.id, input.goal, ...),
);
```

**AsyncLocalStorage 传播保证**：`runWithLlmUsageTracking` 使用 `AsyncLocalStorage.run()` 包裹，所有在 `runner()` 内部发起的异步调用（包括 `llm.invoke()` → `recordTrackedLlmUsage()`）都能通过 `usageTrackingStore.getStore()` 获取 context。

**chat.ts 直接对话路径**（line ~234，仅非 agent 模式分支）：`body.novelId` 可选，有 novelId 时包裹 `runWithLlmUsageTracking({ novelId, stepType: "chat" })`。

**Director 流水线**（已有 `runWithLlmUsageTracking`，需增加 stepType）：在 `NovelDirectorService.buildDirectorUsageContext()` 和 `DirectorNodeRunner` line 134 中根据 `nodeKey` 映射 stepType。

### 3.4 查询层

**novelTokenUsageSummary.ts 改造**：

以 `LlmTokenUsage` 表为主数据源：

```typescript
const rows = await prisma.llmTokenUsage.groupBy({
  by: ['novelId'],
  where: { novelId: { in: novelIds } },
  _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
  _count: true,
  _max: { recordedAt: true },
});
```

**novelTokenUsageByStep.ts（新增）**：

```typescript
export async function getNovelTokenUsageByStep(novelId: string) {
  const rows = await prisma.llmTokenUsage.groupBy({
    by: ['stepType'],
    where: { novelId, stepType: { not: null } },
    _sum: { inputTokens: true, outputTokens: true, totalTokens: true },
    _count: true,
  });
  // 注意：stepType=NULL 的历史记录不参与步骤分布计算
  // 前端面板应标注"仅含已分类步骤"
  const grandTotal = rows.reduce((s, r) => s + (r._sum.totalTokens ?? 0), 0);
  return rows.map(r => ({
    stepType: r.stepType!,
    inputTokens: r._sum.inputTokens ?? 0,
    outputTokens: r._sum.outputTokens ?? 0,
    totalTokens: r._sum.totalTokens ?? 0,
    callCount: r._count,
    percentage: grandTotal > 0 ? (r._sum.totalTokens ?? 0) / grandTotal : 0,
  }));
}
```

**Director 流水线 stepType 映射**：

Director 已有 `runWithLlmUsageTracking` 调用，但未传 stepType。需在 `buildDirectorUsageContext()` 和 `DirectorNodeRunner` 中根据 `nodeKey` 映射：

```typescript
function mapNodeKeyToStepType(nodeKey: string | null): string | null {
  if (!nodeKey) return null;
  const lower = nodeKey.toLowerCase();
  if (lower.includes('draft') || lower.includes('generate')) return 'draft';
  if (lower.includes('repair') || lower.includes('fix')) return 'repair';
  if (lower.includes('review') || lower.includes('quality')) return 'review';
  if (lower.includes('outline')) return 'outline';
  return null;
}
```

**chat.ts 直接对话路径注入**：

chat.ts 有两条路径：agent 模式（→ AgentRuntime，被 T1.5 覆盖）和直接对话模式（→ `llm.stream()` line 234）。仅需包裹直接对话路径，且 `body.novelId` 是可选的：

```typescript
// line ~234, 仅在有 novelId 时包裹
const trackingContext = body.novelId
  ? { novelId: body.novelId, stepType: "chat" }
  : null;
// 在 llm.stream() 调用处包裹（或在 for await 循环结束后记录）
```

**novelTokenUsageSummary 数据源切换注意事项**：

`novelTokenUsageSummary` 从 NovelWorkflowTask + GenerationJob 切换到 LlmTokenUsage。Director 流水线的历史调用已写入 LlmTokenUsage（因为 context 有 workflowTaskId，能通过守卫）。但 GenerationJob 中不属于任何 WorkflowTask 的旧记录可能未写入 LlmTokenUsage。实现时应保留 fallback：当 LlmTokenUsage 无数据时回退到旧查询。

### 3.5 前端组件

**CreativeHubTokenStatsPanel.tsx** 插入 `CreativeHubSidebar.tsx` 的 `CreativeHubRunTracker` 下方。

数据来源：`useQuery` 调用 `GET /api/novels/:novelId/token-stats`。

可视化：`recharts` `PieChart`（复用 `PaceCurveChart.tsx` 的已有模式）。

## 4. 集成测试策略

1. **守卫逻辑测试**：验证仅有 `novelId` 的 context 能通过 `recordTrackedLlmUsage`
2. **Creative Hub 传播测试**：mock `AgentRuntime.start()` 执行，验证 `LlmTokenUsage` 表写入记录
3. **查询聚合测试**：验证 `novelTokenUsageByStep` 返回正确的分组和百分比
4. **API 测试**：验证 `GET /api/novels/:novelId/token-stats` 响应结构
5. **Fallback 测试**：当 `LlmTokenUsage` 无数据时，`novelTokenUsageSummary` 回退到旧查询
6. **Director stepType 测试**：验证 Director 运行后 LlmTokenUsage 记录的 stepType 与 nodeKey 映射一致

## 5. 数据迁移

1. Prisma migration 添加 `stepType` 字段 + 复合索引
2. 回填脚本 `scripts/data/backfill-step-type.ts` 根据 `promptName` 推断历史 `stepType`
3. 无法推断的保持 NULL（不影响统计，`byStep` 查询使用 `stepType: { not: null }` 过滤）
