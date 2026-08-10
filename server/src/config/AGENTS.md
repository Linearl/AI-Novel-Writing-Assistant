<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-08 | Updated: 2026-08-08 -->

# server/src/config

## Purpose
服务端配置模块 — 环境配置、Provider 配置、常量、特性开关、日志配置、错误码等。

## Key Files
| File | Description |
|------|-------------|
| `constants.ts` | 常量定义 |
| `database.ts` | 数据库连接配置 |
| `envValidator.ts` | 环境变量校验 |
| `featureFlags.ts` | 特性开关 |
| `logger.ts` | 日志配置 |
| `rag.ts` | RAG 配置 |
| `imageGeneration.ts` / `imageStorage.ts` | 图片生成/存储配置 |
| `errorCodes.ts` | 错误码 |
| `directorDebug.ts` | director 调试配置 |

## For AI Agents

### Working In This Directory
- 新增环境变量时同步更新 `envValidator.ts` 与根 `.env.example`
- 配置项要有默认值,避免运行时因缺失配置崩溃

## Dependencies

### Internal
- `server/src/platform/` — 基础设施消费配置

### External
- dotenv
