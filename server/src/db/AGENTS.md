<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-08-08 | Updated: 2026-08-08 -->

# server/src/db

## Purpose
数据库访问层 — Prisma client 初始化、seed、restore、运行时迁移、SQLite 专用工具(重试/PRAGMA)。

## Key Files
| File | Description |
|------|-------------|
| `prisma.ts` | Prisma client 初始化 |
| `seed.ts` | 数据 seed |
| `storyModeSeeds.ts` | 故事模式 seed |
| `restore.ts` | 数据库恢复 |
| `runtimeMigrations.ts` | 运行时迁移 |
| `sqlitePragmas.ts` | SQLite PRAGMA 配置 |
| `sqliteRetry.ts` | SQLite 重试处理 |

## For AI Agents

### Working In This Directory
- **数据保护(根 AGENTS.md 最高优先级)**:禁止未经验证的破坏性操作;`prisma migrate reset` / `db reset` 前必须备份并获批准
- schema 定义在 `server/src/prisma/`,本目录只负责运行时访问

## Dependencies

### Internal
- `server/src/prisma/` — schema 与迁移
- `server/src/config/database.ts` — 连接配置

### External
- Prisma 7、better-sqlite3
