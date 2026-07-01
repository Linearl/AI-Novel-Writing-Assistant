---
description: "P2 问题修复技术设计文档"
---

# 技术设计文档

## 1. 安全加固设计

### 1.1 SEC-003: 文件路径遍历防护

**核心思路**：使用 `path.resolve()` 规范化路径，验证最终路径在允许目录内。

```typescript
// server/src/utils/pathSecurity.ts
import path from 'path'

const ALLOWED_BASE_DIRS = [
  path.resolve(process.cwd(), 'uploads'),
  path.resolve(process.cwd(), 'assets'),
]

export function validateFilePath(userInput: string, baseDir: string): string {
  // 拒绝包含 .. 的输入
  if (userInput.includes('..')) {
    throw new Error('Invalid path: directory traversal detected')
  }
  
  const resolved = path.resolve(baseDir, userInput)
  
  // 验证最终路径在允许的目录内
  if (!resolved.startsWith(path.resolve(baseDir))) {
    throw new Error('Invalid path: outside allowed directory')
  }
  
  return resolved
}
```

### 1.2 SEC-004: CSRF 保护

**核心思路**：使用 `csrf-csrf` 库，自动生成和验证 token。

```typescript
// server/src/middleware/csrf.ts
import { doubleCsrf } from 'csrf-csrf'

const { doubleCsrfProtection, generateCsrfToken } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  cookieName: 'x-csrf-token',
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
})

export { doubleCsrfProtection, generateCsrfToken }
```

### 1.3 SEC-005: 错误响应脱敏

**核心思路**：根据 NODE_ENV 决定错误详细程度。

```typescript
// server/src/middleware/errorHandler.ts
export function errorHandler(err, req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production'
  
  res.status(err.status || 500).json({
    error: isProduction ? 'Internal Server Error' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  })
}
```

### 1.4 SEC-006: Prisma raw query 安全

**核心思路**：ESLint 规则禁止字符串拼接的 raw query。

```json
// .eslintrc.json
{
  "rules": {
    "no-restricted-syntax": ["error", {
      "selector": "CallExpression[callee.property.name='$queryRaw'] > TemplateLiteral:not([quasis.0.raw.startsWith('Prisma.sql')])",
      "message": "Use Prisma.sql template tag for parameterized queries"
    }]
  }
}
```

## 2. 稳定性提升设计

### 2.1 STB-001: Zod schema 验证

**核心思路**：为每个路由定义 Zod schema，在中间件层验证。

```typescript
// server/src/schemas/novel.ts
import { z } from 'zod'

export const createNovelSchema = z.object({
  title: z.string().min(1).max(200),
  genre: z.string().optional(),
  description: z.string().max(2000).optional(),
})

// server/src/middleware/validate.ts
export function validate(schema: z.ZodSchema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (err) {
      res.status(400).json({ error: err.errors })
    }
  }
}
```

### 2.2 STB-008/009: 进程保护

**核心思路**：在 app.ts 入口添加进程级错误处理和优雅关闭。

```typescript
// server/src/app.ts
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason })
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack })
  process.exit(1)
})

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  server.close(() => {
    prisma.$disconnect()
    process.exit(0)
  })
})
```

## 3. 架构优化设计

### 3.1 ARCH-003: Prompt Registry 改造

**核心思路**：styleEngine 通过 prompting/registry.ts 调用 prompt，不直接导入 prompting 内部模块。

```typescript
// server/src/prompting/registry.ts
export const promptRegistry = {
  style: {
    detection: styleDetectionPrompt,
    generation: styleGenerationPrompt,
    rewrite: styleRewritePrompt,
  },
}

// server/src/services/styleEngine/StyleDetectionService.ts
import { promptRegistry } from '../../prompting/registry'

// 使用 registry 而不是直接导入
const prompt = promptRegistry.style.detection
```

### 3.2 ARCH-004: Service 层提取

**核心思路**：将路由中的 Prisma 调用提取到 Service 层。

```typescript
// server/src/services/character/CharacterService.ts
export class CharacterService {
  async listCharacters(novelId: string) {
    return prisma.character.findMany({ where: { novelId } })
  }
}

// server/src/routes/character.ts
const characterService = new CharacterService()
router.get('/characters', async (req, res) => {
  const data = await characterService.listCharacters(req.query.novelId)
  res.json(data)
})
```

### 3.3 ARCH-006: Zustand 状态管理

**核心思路**：将组件内的 useState 提取到 Zustand store。

```typescript
// client/src/stores/novelStore.ts
import { create } from 'zustand'

interface NovelState {
  novels: Novel[]
  selectedId: string | null
  isLoading: boolean
  fetchNovels: () => Promise<void>
  selectNovel: (id: string) => void
}

export const useNovelStore = create<NovelState>((set) => ({
  novels: [],
  selectedId: null,
  isLoading: false,
  fetchNovels: async () => {
    set({ isLoading: true })
    const novels = await api.getNovels()
    set({ novels, isLoading: false })
  },
  selectNovel: (id) => set({ selectedId: id }),
}))
```

## 4. 代码质量设计

### 4.1 QUA-003: 函数式编程

**核心思路**：使用 pipe/compose 将操作串联。

```typescript
// server/src/utils/fp.ts
export const pipe = <T>(...fns: Array<(arg: T) => T>) => (initial: T) =>
  fns.reduce((acc, fn) => fn(acc), initial)

// 使用示例
const processChapter = pipe(
  validateChapter,
  enrichMetadata,
  saveToDatabase
)
```

### 4.2 QUA-005: 错误码映射表

**核心思路**：创建 SSOT 错误码定义。

```typescript
// server/src/errors/codes.ts
export const ERROR_CODES = {
  NOVEL_NOT_FOUND: { code: 'NOVEL_NOT_FOUND', message: 'Novel not found', status: 404 },
  CHAPTER_locked: { code: 'CHAPTER_LOCKED', message: 'Chapter is locked', status: 409 },
  // ...
} as const

export type ErrorCode = keyof typeof ERROR_CODES
```

## 5. 可观测性设计

### 5.1 OBS-002: Request ID

**核心思路**：使用 `express-request-id` 中间件。

```typescript
import requestId from 'express-request-id'

app.use(requestId())

// 在日志中使用
logger.info('Request received', { requestId: req.id })
```

### 5.2 OBS-004: WebSocket LLM 追踪

**核心思路**：LLM 调用时通过 WebSocket 推送事件。

```typescript
// server/src/llm/events.ts
import { WebSocketServer } from 'ws'

const wss = new WebSocketServer({ port: 8080 })

export function emitLlmEvent(event: LlmEvent) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(event))
    }
  })
}
```

## 6. 性能优化设计

### 6.1 PERF-003: 查询并行化

**核心思路**：使用 Promise.all 并行执行独立查询。

```typescript
// 优化前
const docs = await prisma.knowledgeDocument.findMany(...)
const jobs = await prisma.ragIndexJob.findMany(...)

// 优化后
const [docs, jobs] = await Promise.all([
  prisma.knowledgeDocument.findMany(...),
  prisma.ragIndexJob.findMany(...),
])
```

### 6.2 PERF-004: 分页和字段选择

**核心思路**：添加 limit 和 select 参数。

```typescript
async listWorlds(options?: { limit?: number, select?: string[] }) {
  return prisma.world.findMany({
    take: options?.limit ?? 50,
    select: options?.select ? 
      Object.fromEntries(options.select.map(f => [f, true])) : 
      undefined,
    orderBy: { updatedAt: 'desc' },
  })
}
```

## 7. 测试基础设施设计

### 7.1 Vitest 配置

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
```

### 7.2 Playwright 配置

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'pnpm dev',
    port: 5173,
  },
})
```

## 8. 兼容性设计

### 8.1 COMP-001: better-sqlite3 迁移

**核心思路**：替换 `node:sqlite` 为 `better-sqlite3`。

```typescript
// 优化前
const { DatabaseSync } = require('node:sqlite')
const db = new DatabaseSync('dev.db')

// 优化后
const Database = require('better-sqlite3')
const db = new Database('dev.db')
```

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 重构引入 bug | 每个阶段运行完整测试套件 |
| Zustand 学习成本 | 提供示例代码和文档 |
| ESLint 规则误报 | 逐步启用，先 warn 后 error |
| Playwright 环境问题 | 提供 Docker 开发环境 |
