---
reqId: 7062
title: "LLM 基础设施增强 — 技术设计"
status: requirements_ready
priority: P2
complexity: S1
estimatedEffort: "2天"
version: v0.2
created: 2026-07-14
updated: 2026-07-14
---

# REQ-7062: LLM 基础设施增强 — 技术设计

## 1. 架构设计

### 1.1 模块分布

```
server/src/
├── llm/
│   ├── usageTracking.ts         ← FR-1: Token 用量追踪
│   ├── structuredInvoke.ts       ← FR-3: 集成 Token 追踪
│   └── requestLimiter.ts         ← FR-2: 热重载
├── prompting/prompts/novel/
│   └── chapterAcceptance.prompts.ts ← FR-4: 验收状态规范化
└── prisma/
    └── schema.prisma             ← 新增 LlmTokenUsage 模型
```

### 1.2 调用链路

```
LLM 调用链路（Token 追踪）：
structuredInvoke()
  ↓
AsyncLocalStorage.run({ novelId, promptName, ... })
  ↓
LLM API 调用
  ↓
返回 usage: { inputTokens, outputTokens }
  ↓
usageTracker.record(snapshot)     ← 采集数据
  ↓
批量队列 → 定时写入 DB            ← 持久化
```

## 2. 详细设计

### 2.1 FR-1: Token 用量追踪

**参考上游**：`server/src/llm/usageTracking.ts`（412 行）

#### AsyncLocalStorage 传播

```typescript
// server/src/llm/usageTracking.ts

import { AsyncLocalStorage } from "node:async_hooks";

interface UsageTrackingContext {
  novelId: string;
  chapterId?: string;
  promptName: string;
  provider: string;
  model: string;
}

interface TokenUsageRecord {
  id: string;
  trackingContext: UsageTrackingContext;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  createdAt: Date;
}

// AsyncLocalStorage 实例
export const usageTrackingStorage = new AsyncLocalStorage<UsageTrackingContext>();

// Token 用量追踪器
class UsageTracker {
  private buffer: TokenUsageRecord[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private readonly FLUSH_INTERVAL_MS = 30_000; // 30 秒
  private readonly MAX_BUFFER_SIZE = 100;

  start(): void {
    this.flushInterval = setInterval(() => this.flush(), this.FLUSH_INTERVAL_MS);
  }

  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush(); // 最后一次刷写
  }

  record(data: {
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
  }): void {
    const ctx = usageTrackingStorage.getStore();
    if (!ctx) return; // 无追踪上下文则跳过

    const record: TokenUsageRecord = {
      id: generateId(),
      trackingContext: ctx,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      totalTokens: data.inputTokens + data.outputTokens,
      latencyMs: data.latencyMs,
      createdAt: new Date(),
    };

    this.buffer.push(record);

    if (this.buffer.length >= this.MAX_BUFFER_SIZE) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const records = [...this.buffer];
    this.buffer = [];

    try {
      await prisma.llmTokenUsage.createMany({
        data: records.map((r) => ({
          id: r.id,
          novelId: r.trackingContext.novelId,
          chapterId: r.trackingContext.chapterId,
          promptName: r.trackingContext.promptName,
          provider: r.trackingContext.provider,
          model: r.trackingContext.model,
          inputTokens: r.inputTokens,
          outputTokens: r.outputTokens,
          totalTokens: r.totalTokens,
          latencyMs: r.latencyMs,
          createdAt: r.createdAt,
        })),
      });
    } catch (error) {
      // 写入失败，放回缓冲区重试
      this.buffer.unshift(...records);
      console.error("[UsageTracker] Flush failed, retrying next cycle", error);
    }
  }

  // 查询接口
  async query(params: {
    novelId?: string;
    provider?: string;
    promptName?: string;
    from?: Date;
    to?: Date;
  }): Promise<TokenUsageRecord[]> {
    return prisma.llmTokenUsage.findMany({
      where: {
        novelId: params.novelId,
        provider: params.provider,
        promptName: params.promptName,
        createdAt: {
          gte: params.from,
          lte: params.to,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const usageTracker = new UsageTracker();
```

#### Prisma Schema 新增

```prisma
// prisma/schema.prisma 新增
model LlmTokenUsage {
  id          String   @id @default(cuid())
  novelId     String
  chapterId   String?
  promptName  String
  provider    String
  model       String
  inputTokens Int
  outputTokens Int
  totalTokens Int
  latencyMs   Int
  createdAt   DateTime @default(now())

  // 索引
  @@index([novelId])
  @@index([provider])
  @@index([promptName])
  @@index([createdAt])
}
```

### 2.2 FR-2: 请求限制器热重载

**参考上游**：`server/src/llm/requestLimiter.ts`（164 行）

```typescript
// server/src/llm/requestLimiter.ts 新增

const sharedLimiters = new Map<string, RateLimiter>();

/**
 * 清除所有缓存的限制器实例
 * 下次请求时根据最新配置重新创建
 */
export function evictSharedLimiters(): void {
  sharedLimiters.clear();
  console.log("[RequestLimiter] All shared limiters evicted");
}

/**
 * 获取或创建限制器（支持热重载）
 */
export function getOrCreateLimiter(
  key: string,
  config: RateLimitConfig
): RateLimiter {
  let limiter = sharedLimiters.get(key);
  if (!limiter) {
    limiter = createRateLimiter(config);
    sharedLimiters.set(key, limiter);
  }
  return limiter;
}
```

#### API 接口

```typescript
// 路由：POST /api/llm/limiter/reload
router.post("/api/llm/limiter/reload", (_req, res) => {
  evictSharedLimiters();
  res.json({ success: true, message: "Limiters evicted" });
});
```

### 2.3 FR-3: Prompt 执行级 Token 追踪

**参考上游**：`server/src/llm/structuredInvoke.ts`（439 行）

```typescript
// 在 invokeStructuredLlm 中集成

import { usageTrackingStorage, usageTracker } from "./usageTracking";

export async function invokeStructuredLlm<T>(params: InvokeParams): Promise<T> {
  const trackingCtx: UsageTrackingContext = {
    novelId: params.novelId ?? "unknown",
    chapterId: params.chapterId,
    promptName: params.promptName ?? "unnamed",
    provider: params.provider ?? "default",
    model: params.model ?? "default",
  };

  // 在 AsyncLocalStorage 上下文中执行
  return usageTrackingStorage.run(trackingCtx, async () => {
    const startTime = Date.now();

    try {
      const result = await originalInvoke(params);
      const latencyMs = Date.now() - startTime;

      // 记录 Token 用量
      if (result.usage) {
        usageTracker.record({
          inputTokens: result.usage.inputTokens ?? 0,
          outputTokens: result.usage.outputTokens ?? 0,
          latencyMs,
        });
      }

      return result;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      // 错误时也记录延迟
      usageTracker.record({
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
      });
      throw error;
    }
  });
}
```

### 2.4 FR-4: 验收状态规范化

**参考上游**：`server/src/prompting/prompts/novel/chapterAcceptance.prompts.ts`（356 行）

```typescript
// 统一枚举定义
export const ACCEPTANCE_STATUSES = {
  PENDING: "pending",
  AUTO_APPROVED: "auto_approved",
  USER_APPROVED: "user_approved",
  REVISION_REQUIRED: "revision_required",
  REJECTED: "rejected",
} as const;

export type AcceptanceStatus =
  (typeof ACCEPTANCE_STATUSES)[keyof typeof ACCEPTANCE_STATUSES];

/**
 * 规范化验收状态字符串
 * 处理旧数据中的非标准值
 */
export function normalizeAcceptanceStatus(
  raw: string | null | undefined
): AcceptanceStatus {
  if (!raw) return "pending";

  const normalized = raw.toLowerCase().trim();

  // 标准值直接返回
  if (Object.values(ACCEPTANCE_STATUSES).includes(normalized as AcceptanceStatus)) {
    return normalized as AcceptanceStatus;
  }

  // 旧值映射
  const LEGACY_MAPPINGS: Record<string, AcceptanceStatus> = {
    approved: "user_approved",
    auto_approved: "auto_approved",
    "needs-revision": "revision_required",
    "needs_revision": "revision_required",
    pending_review: "pending",
  };

  return LEGACY_MAPPINGS[normalized] ?? "pending";
}
```

## 3. 实现步骤

### Phase 1: Token 用量追踪（1 天）

1. Prisma schema 新增 `LlmTokenUsage` 模型
2. 运行 migration
3. 实现 `usageTracking.ts`（AsyncLocalStorage + 批量写入）
4. 在 `structuredInvoke` 中集成追踪
5. 实现查询 API

### Phase 2: 热重载 + 验收规范化（0.5 天）

1. 实现 `evictSharedLimiters()`
2. 添加热重载 API
3. 实现 `normalizeAcceptanceStatus()`
4. 替换硬编码验收状态字符串

### Phase 3: 测试与验证（0.5 天）

1. Token 追踪单元测试
2. 热重载单元测试
3. 验收状态规范化测试
4. typecheck + pnpm test

## 4. 测试计划

```typescript
describe("UsageTracker", () => {
  it("should record token usage in buffer", () => {
    const tracker = new UsageTracker();
    usageTrackingStorage.run(mockContext, () => {
      tracker.record({ inputTokens: 100, outputTokens: 50, latencyMs: 200 });
    });
    expect(tracker.getBufferSize()).toBe(1);
  });

  it("should skip recording when no tracking context", () => {
    const tracker = new UsageTracker();
    tracker.record({ inputTokens: 100, outputTokens: 50, latencyMs: 200 });
    expect(tracker.getBufferSize()).toBe(0);
  });
});

describe("normalizeAcceptanceStatus", () => {
  it("should normalize legacy values", () => {
    expect(normalizeAcceptanceStatus("approved")).toBe("user_approved");
    expect(normalizeAcceptanceStatus("needs-revision")).toBe("revision_required");
  });

  it("should return pending for null/undefined", () => {
    expect(normalizeAcceptanceStatus(null)).toBe("pending");
    expect(normalizeAcceptanceStatus(undefined)).toBe("pending");
  });
});

describe("evictSharedLimiters", () => {
  it("should clear all cached limiters", () => {
    // 添加限制器
    getOrCreateLimiter("test", { maxRequests: 10, windowMs: 60000 });
    // 驱逐
    evictSharedLimiters();
    // 下次获取应创建新实例
  });
});
```

## 5. 交付物

- [ ] `server/src/llm/usageTracking.ts` — 新增/重构
- [ ] `server/src/llm/requestLimiter.ts` — 修改（新增 evictSharedLimiters）
- [ ] `server/src/llm/structuredInvoke.ts` — 修改（集成追踪）
- [ ] `server/src/prompting/prompts/novel/chapterAcceptance.prompts.ts` — 修改（规范化）
- [ ] `server/prisma/schema.prisma` — 修改（新增模型）
- [ ] `server/tests/llm/usageTracking.test.ts` — 新增
- [ ] `server/tests/llm/requestLimiter.test.ts` — 新增
