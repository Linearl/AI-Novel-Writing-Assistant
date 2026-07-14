---
description: "数据库迁移机制说明 — Prisma 迁移约定、版本管理、运行时迁移"
---

# 数据库迁移机制说明

> 基于 Prisma 7 迁移系统，PostgreSQL（生产）/ SQLite（开发）双轨迁移。

---

## 1. 迁移系统概览

| 项目 | 说明 |
|------|------|
| ORM | Prisma 7（`prisma-client-js`） |
| 迁移工具 | `prisma migrate dev`（开发）、`prisma migrate deploy`（部署） |
| PostgreSQL 迁移目录 | `server/src/prisma/migrations/`（48 个迁移） |
| SQLite 迁移目录 | `server/src/prisma/migrations.sqlite/`（64 个迁移） |
| Schema 入口 | `server/src/prisma/schema.prisma`（PostgreSQL） |
| SQLite Schema | `server/src/prisma/schema.sqlite.prisma`（独立维护） |

---

## 2. 迁移命名约定

```text
YYYYMMDDHHMMSS_<描述性名称>/
  └── migration.sql
```

示例：
- `20260413120000_postgresql_baseline/` — PostgreSQL 基线迁移
- `20260424223000_character_resource_ledger/` — 角色资源台账功能
- `20260529120000_novel_world_instance/` — 小说世界观实例

**命名规则**：时间戳（精确到秒）+ 下划线 + kebab-case 功能描述。

---

## 3. 迁移工作流

### 3.1 开发阶段

```bash
# 1. 修改 schema.prisma
# 2. 生成迁移
pnpm db:migrate    # 等价于 prisma migrate dev

# 3. 迁移自动执行以下步骤：
#    a. 检测 schema 变更
#    b. 生成 SQL 迁移文件
#    c. 在本地数据库执行迁移
#    d. 重新生成 Prisma Client
```

### 3.2 部署阶段

```bash
# 生产环境仅执行迁移，不重新生成
prisma migrate deploy
```

### 3.3 迁移锁定

`server/src/prisma/migrations/migration_lock.toml` 记录数据库 provider：

```toml
provider = "postgresql"
```

SQLite 迁移目录有独立的 lock 文件，provider 为 `sqlite`。

---

## 4. 双轨迁移策略

项目维护 PostgreSQL 和 SQLite 两套独立的迁移轨道：

| 轨道 | 目录 | 用途 |
|------|------|------|
| PostgreSQL | `migrations/` | 生产环境 |
| SQLite | `migrations.sqlite/` | 开发环境（默认） |

**注意**：两套迁移的 SQL 语法不完全相同（如 `TEXT` vs `TEXT`、自增策略等），需分别维护。

---

## 5. 运行时迁移（Runtime Migrations）

项目实现了运行时 Schema 漂移修复机制：

**文件**：`server/src/db/runtimeMigrations.ts`

**功能**：在应用启动时检测并修复 Schema 漂移（如遗漏的列、索引）。

**使用场景**：
- 开发阶段快速迭代时，避免每次小改动都跑正式迁移
- 修复生产环境中偶尔出现的 Schema 不一致

**注意**：运行时迁移是补充手段，不能替代正式的 Prisma 迁移。

---

## 6. 种子数据

**文件**：`server/src/db/seed.ts`

```bash
pnpm db:seed
```

执行 `ensureSystemResourceStarterData()` 初始化系统资源数据。

**故事模式种子**：`server/src/db/storyModeSeeds.ts`（39.7KB），包含 39 种故事模式的初始数据。

---

## 7. 关键迁移里程碑

| 迁移 | 日期 | 说明 |
|------|------|------|
| `20260313170000_init` | 2026-03-13 | SQLite 初始 Schema |
| `20260328120000_schema_gap_backfill` | 2026-03-28 | Schema 缺口回填 |
| `20260413120000_postgresql_baseline` | 2026-04-13 | PostgreSQL 基线建立 |
| `20260424223000_character_resource_ledger` | 2026-04-24 | 角色资源台账 |
| `20260428103000_director_runtime_ledger` | 2026-04-28 | Director 运行时系统 |
| `20260529120000_novel_world_instance` | 2026-05-29 | 小说世界观实例 |
| `20260609120000_drama_forge_pipeline` | 2026-06-09 | 短剧制作流水线 |
| `20260612000000_add_comic_module` | 2026-06-12 | 漫画改编模块 |
| `20260710120000_novel_json_consolidation` | 2026-07-10 | 小说 JSON 字段整合（最新） |

---

## 8. 迁移注意事项

1. **禁止手动修改已执行的迁移文件**：迁移历史是不可变的，如需修正，创建新的迁移
2. **SQLite 迁移需独立维护**：PostgreSQL 迁移不自动同步到 SQLite 轨道
3. **生产环境先备份再迁移**：执行 `prisma migrate deploy` 前必须备份数据库
4. **迁移测试**：重大 Schema 变更应在开发环境验证迁移回滚路径
5. **新增字段默认值**：大量数据表新增字段时，优先使用数据库层 `DEFAULT` 值，避免全表 UPDATE
