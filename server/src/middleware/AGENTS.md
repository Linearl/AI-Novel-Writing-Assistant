<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-08 | Updated: 2026-08-08 -->

# server/src/middleware

## Purpose
Express 中间件 — 认证、错误处理、限流、请求 ID、参数校验。

## Key Files
| File | Description |
|------|-------------|
| `auth.ts` | 认证中间件 |
| `errorHandler.ts` | 统一错误处理 |
| `rateLimiter.ts` | 限流 |
| `requestId.ts` | 请求 ID 注入 |
| `validate.ts` | 请求参数校验 |

## For AI Agents

### Working In This Directory
- 新中间件按现有模式单文件实现,在 `server/src/app.ts` 挂载
- 错误处理中间件负责统一错误码与响应格式

## Dependencies

### Internal
- `server/src/app.ts` — 挂载点

### External
- Express 5
