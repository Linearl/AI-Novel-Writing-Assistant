---
description: "better-sqlite3 迁移可行性评估"
---

# T32: better-sqlite3 直连迁移评估

> 任务来源：r7009 T32（4h 评估）
> 状态：已完成评估
> 日期：2026-07-03

## 当前实现

项目已通过 Prisma Driver Adapter 模式使用 better-sqlite3：

```
server/src/db/prisma.ts
  → imports @prisma/adapter-better-sqlite3
  → new PrismaBetterSqlite3({ url, timeout })
  → new PrismaClient({ adapter })
```

关键文件：
- `server/src/db/prisma.ts` — 连接初始化，选择 `PrismaBetterSqlite3` 或 `PrismaPg`
- `server/src/db/sqlitePragmas.ts` — WAL 模式配置（`journal_mode=WAL`, `synchronous=NORMAL`, `wal_autocheckpoint=1000`）
- `server/src/db/sqliteRetry.ts` — SQLITE_BUSY 重试层（250ms/1000ms/2500ms）
- `server/src/prisma/schema.sqlite.prisma` — SQLite 专用 schema（provider = "sqlite"）

## 迁移评估

### 什么是"better-sqlite3 直连迁移"

指绕过 Prisma ORM，直接使用 better-sqlite3 API 进行数据库操作，完全替换 Prisma Client 层。

### 会改变什么

| 层 | 当前 | 迁移后 |
|---|---|---|
| 连接 | `PrismaClient({ adapter: PrismaBetterSqlite3 })` | `new Database(path)` |
| 查询 | `prisma.chapter.findMany()` | `db.prepare('SELECT ...').all()` |
| 事务 | `prisma.$transaction([])` | `db.transaction(() => { ... })()` |
| Schema | `schema.sqlite.prisma` | 手写 migration SQL |
| 类型安全 | Prisma Client 自动生成类型 | 手动定义或使用 Zod |
| 迁移 | `prisma migrate dev` | 手动 SQL 文件管理 |

### 风险分析

| 风险 | 严重度 | 说明 |
|---|---|---|
| 数据迁移成本 | 高 | 所有 Prisma 查询须重写，约 50+ 处调用点 |
| 迁移系统丢失 | 高 | `prisma migrate` 失效，需手动管理 schema 变更 |
| 类型安全丧失 | 中 | 需自行维护查询结果类型，易出现运行时错误 |
| 双数据库兼容 | 高 | 项目同时支持 SQLite 和 PostgreSQL（生产），直连 SQLite 意味着放弃 Prisma 的数据库抽象，需维护两套数据层 |
| 测试维护 | 中 | 所有现有测试依赖 Prisma Client，需全部重写 |

### 性能收益分析

| 维度 | 当前（Prisma+adapter） | 直连 better-sqlite3 |
|---|---|---|
| 查询延迟 | Prisma 有 Schema 解析/转换开销 | 零 ORM 开销 |
| 批量操作 | 逐条或 $transaction | 原生 `db.transaction()` 更快 |
| WAL 已配置 | 是 | 是（不变） |
| 实际瓶颈 | LLM API 调用是主要延迟来源 | 不变 |

**关键结论**：本项目的性能瓶颈是 LLM API 调用，不是数据库查询。SQLite 直连带来的微秒级查询优化对用户体验无感知提升。

### 已有的优化措施

项目已实施以下 SQLite 优化，无需迁移即可获得大部分收益：
1. WAL 模式（`sqlitePragmas.ts`）
2. `synchronous = NORMAL`（减少 fsync 频率）
3. 15 秒 busy timeout（`SQLITE_BUSY_TIMEOUT_MS`）
4. 自动重试层（`sqliteRetry.ts`）
5. `wal_autocheckpoint = 1000`（控制 WAL 文件大小）

## 结论与建议

**建议：推迟此迁移，当前方案已足够。**

理由：
1. **收益与成本严重不对等**：微小的查询性能提升 vs 全面重写数据访问层
2. **已通过 adapter 获得 better-sqlite3 优势**：WAL、busy timeout、重试都已配置
3. **破坏 Prisma 双数据库抽象**：项目同时支持 SQLite（dev）和 PostgreSQL（prod），Prisma 是统一的数据层
4. **LLM 是真正瓶颈**：数据库查询延迟对整体响应时间影响极小
5. **维护成本增加**：失去 `prisma migrate`、类型生成、schema 验证

**如果未来确实需要直连（例如需要原生 SQLite 扩展），建议：**
- 仅在特定热路径（如章节内容批量更新）使用 better-sqlite3 直连
- 保留 Prisma 作为主数据层
- 通过 Prisma 的 `$queryRaw` 或 `$executeRaw` 桥接，而非完全替换
