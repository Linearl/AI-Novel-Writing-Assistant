<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# server/src/prisma

## Purpose
Prisma schema 与迁移历史。承载 SQLite(dev)/PostgreSQL(prod)两套 schema 和迁移。

## Key Files
| File | Description |
|------|-------------|
| `schema.prisma` | 主 schema(主数据库) |
| `schema.sqlite.prisma` | SQLite 专用 schema(dev) |
| `prisma.config.ts` | Prisma 配置 |

## Subdirectories
| Directory | Purpose |
|-----------|---------|
| `migrations/` | 主数据库迁移 |
| `migrations.sqlite/` | SQLite 迁移(本仓库活跃目录,从 `20260313170000_init` 至今) |

## For AI Agents

### Working In This Directory
- **绝对不要**直接执行 `prisma migrate reset` / `db reset` — 见根 AGENTS.md "Safety Rules → Data Protection"
- 任何破坏性操作前必须有 verified backup
- 修改 schema 后生成新迁移:`pnpm db:migrate`
- 迁移后必须跑 typecheck:`pnpm typecheck`

### Migration Hygiene
- 迁移文件名遵循 `<timestamp>_<name>/` 格式
- 不要在迁移里塞业务逻辑
- 大表结构变更前先确认有 backup 路径

## Dependencies

### Internal
- 根 `AGENTS.md` "Safety Rules" 最高优先级
- `server/package.json` — `db:migrate` / `db:seed` / `db:restore` / `db:prune-snapshots` / `db:studio` scripts