---
description: "REQ-7044: 检查点管理 — 技术设计"
update_time: "2026-07-11"
status: todo
---

# REQ-7044: 检查点管理 — 技术设计

## 1. 架构设计

### 1.1 实现位置

检查点管理功能分布在服务端API和数据库层：

```
调用链路：
客户端请求
  ↓
modules/novel/checkpoint/http/  ← HTTP路由
  ↓
modules/novel/checkpoint/CheckpointService.ts  ← 业务逻辑
  ↓
Prisma Checkpoint Model  ← 数据存储
```

### 1.2 核心组件

```typescript
// modules/novel/checkpoint/CheckpointService.ts

interface CheckpointManager {
  // 列表查询
  listCheckpoints(novelId: string, options: ListOptions): Promise<CheckpointPage>;

  // 删除
  deleteCheckpoint(checkpointId: string): Promise<void>;
  deleteCheckpoints(ids: string[]): Promise<void>;

  // 标记保留
  pinCheckpoint(checkpointId: string): Promise<void>;
  unpinCheckpoint(checkpointId: string): Promise<void>;

  // 自动清理
  cleanupOldCheckpoints(novelId: string, keepCount: number): Promise<void>;
}
```

## 2. 详细设计

### 2.1 数据库Schema变更

```prisma
// server/prisma/schema.prisma

model Checkpoint {
  id          String   @id @default(cuid())
  novelId     String
  chapterIndex Int
  data        Json
  createdAt   DateTime @default(now())

  // 新增字段
  isPinned    Boolean  @default(false)
  label       String?

  novel Novel @relation(fields: [novelId], references: [id])

  @@index([novelId, createdAt])
}
```

### 2.2 列表查询实现

```typescript
async function listCheckpoints(
  novelId: string,
  options: { page: number; pageSize: number; pinnedOnly?: boolean }
): Promise<{ items: Checkpoint[]; total: number }> {
  const { page, pageSize, pinnedOnly } = options;

  const where = { novelId, ...(pinnedOnly ? { isPinned: true } : {}) };

  const [items, total] = await Promise.all([
    prisma.checkpoint.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, chapterIndex: true, createdAt: true, isPinned: true, label: true },
    }),
    prisma.checkpoint.count({ where }),
  ]);

  return { items, total };
}
```

### 2.3 自动清理逻辑

```typescript
async function cleanupOldCheckpoints(
  novelId: string,
  keepCount: number = 20
): Promise<number> {
  // 1. 查询总检查点数量
  const total = await prisma.checkpoint.count({
    where: { novelId, isPinned: false },
  });

  if (total <= keepCount) return 0;

  // 2. 计算需要删除的数量
  const toDelete = total - keepCount;

  // 3. 找到最旧的非保留检查点
  const oldest = await prisma.checkpoint.findMany({
    where: { novelId, isPinned: false },
    orderBy: { createdAt: 'asc' },
    take: toDelete,
    select: { id: true },
  });

  // 4. 批量删除
  if (oldest.length > 0) {
    await prisma.checkpoint.deleteMany({
      where: { id: { in: oldest.map((c) => c.id) } },
    });
  }

  return oldest.length;
}
```

### 2.4 删除逻辑

```typescript
async function deleteCheckpoint(checkpointId: string): Promise<void> {
  const checkpoint = await prisma.checkpoint.findUnique({
    where: { id: checkpointId },
    select: { isPinned: true },
  });

  if (!checkpoint) throw new Error('Checkpoint not found');
  if (checkpoint.isPinned) throw new Error('Cannot delete pinned checkpoint');

  await prisma.checkpoint.delete({ where: { id: checkpointId } });
}

async function deleteCheckpoints(ids: string[]): Promise<void> {
  await prisma.checkpoint.deleteMany({
    where: { id: { in: ids } },
  });
}
```

## 3. 接口设计

### 3.1 HTTP API

```
GET    /api/novels/:novelId/checkpoints?page=1&pageSize=20
POST   /api/novels/:novelId/checkpoints/:id/pin
POST   /api/novels/:novelId/checkpoints/:id/unpin
DELETE /api/novels/:novelId/checkpoints/:id
DELETE /api/novels/:novelId/checkpoints/batch
```

### 3.2 响应格式

```typescript
interface CheckpointResponse {
  id: string;
  chapterIndex: number;
  createdAt: string;
  isPinned: boolean;
  label: string | null;
}

interface ListCheckpointsResponse {
  items: CheckpointResponse[];
  total: number;
  page: number;
  pageSize: number;
}
```

## 4. 实现步骤

### Phase 1: 数据库迁移（0.5h）

1. 更新Prisma Schema（新增isPinned, label字段）
2. 执行迁移

### Phase 2: 服务层实现（0.5d）

1. 实现CheckpointService
2. 实现列表查询
3. 实现删除逻辑
4. 实现标记保留逻辑
5. 实现自动清理逻辑

### Phase 3: API层实现（0.5d）

1. 创建HTTP路由
2. 参数校验
3. 错误处理

### Phase 4: 测试（0.5d）

1. 单元测试：清理逻辑
2. 单元测试：删除逻辑
3. 集成测试：完整API

## 5. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 清理误删重要检查点 | 用户数据丢失 | 中 | 标记保留 + 清理日志 |
| 数据库迁移失败 | 功能不可用 | 低 | 测试环境先验证 |
| 并发清理冲突 | 数据不一致 | 低 | 事务保证 |

## 6. 交付物

- [ ] Prisma Schema迁移文件
- [ ] `server/src/modules/novel/checkpoint/CheckpointService.ts`
- [ ] `server/src/modules/novel/checkpoint/http/checkpointRoutes.ts`
- [ ] `server/tests/modules/checkpoint/checkpointService.test.ts`
