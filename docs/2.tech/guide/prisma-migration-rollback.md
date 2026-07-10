---
description: "Prisma 迁移手动回滚标准操作流程（SOP）"
---

# Prisma 迁移回滚 SOP

Prisma 不内置自动回滚功能。当某次迁移需要回退时，需要手动编写逆向 SQL 并标记迁移状态。本文档适用于项目使用的 SQLite（开发）和 PostgreSQL（生产）两种数据库。

## 前提条件

- 项目当前支持 SQLite（默认）和 PostgreSQL 两种数据库
- SQLite 迁移目录：`server/src/prisma/migrations.sqlite/`
- PostgreSQL 迁移目录：`server/src/prisma/migrations/`
- 每次迁移包含一个 `migration.sql` 文件

## 操作步骤

### 第一步：确认目标回滚的 migration 名称

```bash
# 查看最近执行的迁移
ls -lt server/src/prisma/migrations.sqlite/ | head -5

# 或查看 PostgreSQL
ls -lt server/src/prisma/migrations/ | head -5
```

找到需要回滚的迁移目录名（如 `20260426110000_character_library_sync`）。

### 第二步：备份当前数据库

```bash
# SQLite
cp server/prisma/dev.db server/prisma/dev.db.bak.$(date +%Y%m%d%H%M%S)

# PostgreSQL
pg_dump -h localhost -U postgres ai_novel > backup_$(date +%Y%m%d%H%M%S).sql
```

**备份完成前不要执行后续步骤。**

### 第三步：手动编写逆向 SQL

查看该迁移的 `migration.sql`，根据内容编写逆向操作。

**常见逆向模式：**

| 迁移操作 | 逆向操作 |
|----------|----------|
| `CREATE TABLE` | `DROP TABLE` |
| `ALTER TABLE ADD COLUMN` | `ALTER TABLE DROP COLUMN` |
| `CREATE INDEX` | `DROP INDEX` |
| `CREATE UNIQUE INDEX` | `DROP INDEX` |
| `ALTER TABLE RENAME COLUMN` | `ALTER TABLE RENAME COLUMN`（改回旧名） |
| `UPDATE ... SET` | 无法自动逆向，需根据业务逻辑恢复 |

**示例**：回滚 `20260426110000_character_library_sync`

该迁移创建了 `BaseCharacterRevision`、`CharacterLibraryLink`、`CharacterSyncProposal` 三张表和多个索引。逆向 SQL：

```sql
-- prisma/rollback_20260426110000.sql
-- 回滚 character_library_sync 迁移

-- 按依赖顺序删除（外键约束方向）
DROP TABLE IF EXISTS "CharacterSyncProposal";
DROP TABLE IF EXISTS "CharacterLibraryLink";
DROP TABLE IF EXISTS "BaseCharacterRevision";
```

**示例**：回滚 `20260402153000_provider_base_url_and_optional_key`

该迁移为 `APIKey` 表新增了 `baseURL` 列。逆向 SQL：

```sql
-- prisma/rollback_20260402153000.sql
-- 回滚 provider_base_url_and_optional_key 迁移

PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "APIKey_old" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "key" TEXT,
    "model" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "APIKey_old" ("createdAt", "id", "isActive", "key", "model", "provider", "updatedAt")
SELECT "createdAt", "id", "isActive", "key", "model", "provider", "updatedAt"
FROM "APIKey";

DROP TABLE "APIKey";
ALTER TABLE "APIKey_old" RENAME TO "APIKey";

CREATE UNIQUE INDEX "APIKey_provider_key" ON "APIKey"("provider");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
```

### 第四步：执行逆向 SQL

```bash
# SQLite
sqlite3 server/prisma/dev.db < server/prisma/rollback_20260426110000.sql

# PostgreSQL
psql -h localhost -U postgres -d ai_novel -f server/prisma/rollback_20260426110000.sql
```

### 第五步：标记迁移已回滚

```bash
# 标记该迁移为已回滚（Prisma 将不再跟踪此迁移）
npx prisma migrate resolve --rolled-back 20260426110000_character_library_sync \
  --schema server/src/prisma/schema.sqlite.prisma
```

> **PostgreSQL** 项目需将 `--schema` 参数指向 `server/src/prisma/schema.prisma`。

### 第六步：验证数据完整性

```bash
# 检查 Prisma migration 状态
npx prisma migrate status --schema server/src/prisma/schema.sqlite.prisma

# 验证表结构
sqlite3 server/prisma/dev.db ".schema"

# 验证关键数据行数
sqlite3 server/prisma/dev.db "SELECT count(*) FROM Novel;"
```

## 注意事项

1. **备份优先**：任何回滚操作前必须完成可验证的数据库备份。
2. **业务数据逆向**：`UPDATE` / `INSERT` 类型的迁移无法通过 SQL 逆向恢复，需要根据业务逻辑编写恢复脚本或从备份恢复。
3. **外键约束**：SQLite 回滚时注意使用 `PRAGMA foreign_keys=OFF` 避免约束冲突；PostgreSQL 使用 `DROP ... CASCADE` 或按依赖顺序逆向。
4. **多迁移依赖**：如果要回滚的迁移之后还有依赖其变更的迁移，需要先回滚所有下游迁移，再回滚目标迁移。
5. **Prisma Client**：回滚后运行 `npx prisma generate` 重新生成客户端，确保 ORM 层与数据库结构一致。
6. **测试验证**：回滚完成后运行 `pnpm test` 确认业务逻辑不受影响。
7. **生产环境**：生产环境回滚需在低峰期执行，建议通知团队成员暂停数据库操作。
