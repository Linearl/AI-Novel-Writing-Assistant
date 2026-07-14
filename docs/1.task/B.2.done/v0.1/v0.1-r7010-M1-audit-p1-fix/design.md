---
description: "REQ-7010 方案设计"
---

# REQ-7010 方案设计

> 版本：v0.1 | 创建日期：2026-07-01

---

## 1. 概述

修复全量审计发现的 7 个 P1 关键问题，提升系统安全性、稳定性和可维护性。

---

## 2. 技术方案

### 2.1 STB-008: 进程保护

**文件**: `server/src/app.ts`

```typescript
// 未捕获异常处理
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => process.exit(0));
});
```

---

### 2.2 SEC-001: 静态 API Token 认证

**新增文件**:
- `server/src/services/auth/TokenService.ts` — Token 生成和验证
- `server/src/middleware/auth.ts` — 重写认证中间件

**流程**:
1. 首次启动生成 32 字节随机 token
2. 写入 `.env` 的 `API_TOKEN=` 字段
3. authMiddleware 检查 `Authorization: Bearer <token>`
4. 前端请求拦截器自动附加 token

**接口设计**:
```typescript
// TokenService
class TokenService {
  getToken(): string
  validateToken(token: boolean
}

// authMiddleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!tokenService.validateToken(token)) {
    return res.status(401).json({ error: 'Unauthorized'  });
  }
  next();
}
```

---

### 2.3 SEC-002: 速率限制

**新增文件**: `server/src/middleware/rateLimiter.ts`

**配置**:
- 全局默认: 100 req/min
- LLM 端点: 20 req/min
- 错误响应返回 `Retry-After` header

```typescript
import rateLimit from 'express-rate-limit';

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const llmLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
```

---

### 2.4 OBS-001: Logger 迁移

**迁移规则**:
- `console.log` → `logger.info`
- `console.warn` → `logger.warn`
- `console.error` → `logger.error`
- `console.debug` → `logger.debug`

**导入统一**:
```typescript
import { logger } from '@/services/logging/LoggerService';
```

**迁移范围** (server 端 ~52 个文件):
- server/src/services/
- server/src/routes/
- server/src/middleware/
- server/src/agents/
- server/src/modules/

---

### 2.5 ARCH-001: 循环引用解耦

**新增文件**:
- `server/src/services/mediation/interfaces.ts` — 共享接口
- `server/src/services/mediation/NovelPlannerMediator.ts` — 中介器

**依赖方向**:
```
novel → mediator ← planner
```

**接口设计**:
```typescript
// interfaces.ts
interface IPlannerService {
  planChapter(context: ChapterPlanContext): Promise<ChapterPlan>;
}

interface INovelService {
  getChapter(chapterId: string): Promise<Chapter>;
}

// NovelPlannerMediator.ts
class NovelPlannerMediator {
  constructor(
    private planner: IPlannerService,
    private novel: INovelService
  ) {}

  async coordinateChapterPlan(chapterId: string) {
    const chapter = await this.novel.getChapter(chapterId);
    return this.planner.planChapter(chapter);
  }
}
```

---

### 2.6 QUA-001: 超大文件拆分

**拆分策略**:

| 原文件 | 行数 | 拆分方案 |
|---|---|---|
| PlannerService.ts | 992 | PlannerCore + PlannerQuery + PlannerCommand |
| CharacterPreparationService.ts | 845 | CharacterCreate + CharacterUpdate + CharacterQuery |
| directorRuntime.ts | 1273 | types.ts + stages/ 子目录 |
| NovelAutoDirectorDialog.tsx | 654 | hooks/ + components/ 子目录 |

**通用策略**:
- 提取工具函数到 utils/
- 提取类型定义到 types.ts
- 提取 hooks 到 hooks/
- 提取子组件到 components/
- 每个模块 < 400 行

---

### 2.7 QUA-002: 超长函数拆分

**Top-10 拆分清单**:

| 函数 | 行数 | 拆分方案 |
|---|---|---|
| runFromReady() | ~610 | runInit + runExecute + runFinalize |
| NovelAutoDirectorDialog | ~654 | useDirectorDialog hook + 子组件 |

**拆分策略**:
- 提取纯逻辑到独立函数
- React 组件: 提取 custom hooks + 子组件
- 服务函数: 按阶段/职责拆分
- 每个函数 < 50 行

---

## 3. 接口变更

无新增 API 接口，仅修改内部实现。

---

## 4. 数据模型

无变更。

---

## 5. 异常处理

- 认证失败: 401 Unauthorized
- 速率限制: 429 Too Many Requests
- 进程异常: 记录日志后优雅退出
