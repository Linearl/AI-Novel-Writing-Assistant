---
description: "数据库备份策略 — SQLite 开发环境 + PostgreSQL 生产环境双模式"
---

# 数据库备份策略

---

## 1. 双模式备份概览

| 环境 | 数据库 | 备份方式 | 备份频率 |
|------|--------|----------|----------|
| 开发 | SQLite（`file:./dev.db`） | 文件复制 | 手动（重大操作前） |
| 生产 | PostgreSQL | `pg_dump` | 待制定 |

---

## 2. SQLite 开发环境备份

### 2.1 备份方法

```bash
# 最简单的方式：直接复制 .db 文件
cp server/src/prisma/dev.db server/src/prisma/dev.db.bak.$(date +%Y%m%d)

# 使用 Prisma 数据库浏览器查看
pnpm db:studio
```

**注意**：SQLite 备份应直接复制 `.db` 文件，不要逐表导出 JSON（已验证的最佳实践）。

### 2.2 备份时机

以下操作前**必须**备份：

- `prisma migrate reset`（重置数据库）
- `prisma db push --force-reset`（强制同步 Schema）
- 手动执行破坏性 SQL（DELETE、DROP）
- 测试种子数据前

### 2.3 备份文件管理

- 备份文件放在 `server/src/prisma/` 目录下，命名格式：`dev.db.bak.YYYYMMDD`
- 定期清理超过 7 天的备份文件
- `.gitignore` 已排除 `*.db.bak.*` 文件

---

## 3. PostgreSQL 生产环境备份（待完善）

当前项目生产环境备份策略尚未正式制定。以下为推荐方案：

### 3.1 推荐备份方式

```bash
# 逻辑备份（推荐）
pg_dump -h localhost -U postgres -d ai_novel -Fc -f backup_$(date +%Y%m%d).dump

# 如在 Docker 环境
docker exec postgres pg_dump -U postgres -d ai_novel -Fc > backup_$(date +%Y%m%d).dump
```

### 3.2 建议备份策略

| 项目 | 建议 |
|------|------|
| 备份频率 | 每日自动备份（凌晨低峰期） |
| 备份保留 | 活跃 7 天，归档 30 天 |
| 备份验证 | 每月执行一次恢复测试 |
| 异地备份 | 生产数据同步到对象存储（待规划） |

---

## 4. 数据保护规则

根据项目 `AGENTS.md` 约定，执行任何破坏性数据操作前**必须**：

1. 获取用户明确批准
2. 完成备份并确认备份路径
3. 验证备份可恢复

**破坏性操作包括**：
- `prisma migrate reset`
- `DELETE FROM <table>`（无 WHERE 条件）
- `DROP TABLE` / `DROP DATABASE`
- 批量数据清理脚本
