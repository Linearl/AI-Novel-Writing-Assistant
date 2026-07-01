---
description: "P3 问题修复技术设计文档"
---

# 技术设计文档

## 1. 稳定性修复

### 1.1 STB-004: EventBus 错误日志

```typescript
// server/src/events/EventBus.ts
async emit(event: string, data: any) {
  const handlers = this.handlers.get(event) || []
  for (const handler of handlers) {
    try {
      await handler(data)
    } catch (error) {
      logger.error('EventBus handler error', { event, error: error.message })
      // 不重新抛出，避免阻塞其他 handler
    }
  }
}
```

### 1.2 STB-011: SSE 心跳 unref

```typescript
// server/src/llm/streaming.ts
const heartbeat = setInterval(() => {
  res.write(': heartbeat\n\n')
}, 15000)
heartbeat.unref() // 允许进程退出
```

## 2. 架构优化

### 2.1 ARCH-011: 模型目录配置化

```typescript
// server/src/config/models.ts
export const MODEL_REGISTRY = {
  'claude-3-opus': { provider: 'anthropic', maxTokens: 4096 },
  'claude-3-sonnet': { provider: 'anthropic', maxTokens: 4096 },
  'gpt-4-turbo': { provider: 'openai', maxTokens: 4096 },
  // ...
} as const

export function getModelConfig(modelId: string) {
  return MODEL_REGISTRY[modelId]
}
```

### 2.2 ARCH-012: Agent 工具分类 AI 化

```typescript
// server/src/agents/catalog.ts
// 替代关键词匹配，使用 AI 分类
async function classifyTool(toolName: string, description: string): Promise<ToolCategory> {
  const result = await invokeStructuredLlm({
    prompt: `Classify this tool into a category: ${toolName} - ${description}`,
    schema: toolCategorySchema,
  })
  return result.category
}
```

## 3. 代码质量

### 3.1 QUA-008: 魔数提取

```typescript
// server/src/constants/timeouts.ts
export const TIMEOUTS = {
  LLM_REQUEST: 30000,
  LLM_STREAMING: 60000,
  DATABASE_QUERY: 5000,
  FILE_OPERATION: 10000,
} as const

export const LIMITS = {
  MAX_CHAPTER_LENGTH: 10000,
  MAX_RETRY_ATTEMPTS: 3,
  BATCH_SIZE: 100,
} as const
```

## 4. 测试基础设施

### 4.1 TEST-004: Fixtures/Helpers

```typescript
// server/tests/helpers/fixtures.ts
export function createTestNovel(overrides?: Partial<Novel>) {
  return {
    id: 'test-novel-1',
    title: 'Test Novel',
    ...overrides,
  }
}

export function createTestChapter(novelId: string, overrides?: Partial<Chapter>) {
  return {
    id: 'test-chapter-1',
    novelId,
    title: 'Chapter 1',
    content: 'Test content',
    order: 1,
    ...overrides,
  }
}
```

### 4.2 TEST-006: Prisma Mock 层

```typescript
// server/tests/helpers/prisma-mock.ts
import { mockDeep } from 'vitest-mock-extended'
import { PrismaClient } from '@prisma/client'

export const prismaMock = mockDeep<PrismaClient>()

export function setupPrismaMock() {
  vi.mock('../../src/db/prisma', () => ({
    prisma: prismaMock,
  }))
}
```

## 5. 可观测性

### 5.1 OBS-005: 健康检查增强

```typescript
// server/src/routes/health.ts
router.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    llm: await checkLlmConnection(),
    storage: await checkStorage(),
    memory: process.memoryUsage(),
  }
  
  const isHealthy = Object.values(checks).every(c => c.status === 'ok')
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    checks,
    uptime: process.uptime(),
  })
})
```

### 5.2 OBS-008: LLM 调试日志配置化

```typescript
// server/src/llm/debugLogging.ts
const DEBUG_ENABLED = process.env.LLM_DEBUG_LOGGING === 'true'

export function logLlmCall(request: any, response: any) {
  if (!DEBUG_ENABLED) return
  
  logger.debug('LLM call', {
    model: request.model,
    tokens: response.usage,
    duration: response.duration,
  })
}
```

## 6. 可维护性

### 6.1 MAINT-011: Barrel Export

```typescript
// shared/types/index.ts
export * from './novel'
export * from './chapter'
export * from './character'
export * from './directorRuntime'
// ...
```

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 测试 mock 不准确 | 定期与实际 Prisma 接口同步 |
| 模型配置遗漏 | 提供默认配置和回退机制 |
| 健康检查误报 | 设置合理的超时和阈值 |
