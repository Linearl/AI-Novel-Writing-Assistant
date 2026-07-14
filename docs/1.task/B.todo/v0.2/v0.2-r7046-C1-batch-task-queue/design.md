---
description: "REQ-7046: 批量任务队列 — 技术设计"
update_time: "2026-07-11"
status: todo
---

# REQ-7046: 批量任务队列 — 技术设计

## 1. 架构设计

### 1.1 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    前端 (React)                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  BatchTaskManager 组件                           │   │
│  │  - 添加任务表单                                  │   │
│  │  - 队列状态面板                                  │   │
│  │  - 进度条                                        │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    后端 (Express)                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  HTTP API                                       │   │
│  │  - POST /batch/add                              │   │
│  │  - GET /batch/status                            │   │
│  │  - POST /batch/pause                            │   │
│  │  - POST /batch/resume                           │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  BatchQueueService                              │   │
│  │  - 任务入队                                      │   │
│  │  - 批次分解                                      │   │
│  │  - 调度执行                                      │   │
│  │  - 状态管理                                      │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  TaskScheduler (后台调度器)                      │   │
│  │  - 批次执行                                      │   │
│  │  - 失败重试                                      │   │
│  │  - 批次衔接                                      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 1.2 核心组件

```typescript
// server/src/modules/novel/batch/BatchQueueService.ts

interface BatchQueueService {
  // 队列管理
  addToQueue(novelId: string, chapters: number[]): Promise<BatchQueue>;
  pauseQueue(queueId: string): Promise<void>;
  resumeQueue(queueId: string): Promise<void>;
  clearQueue(queueId: string): Promise<void>;

  // 状态查询
  getQueueStatus(queueId: string): Promise<BatchQueueStatus>;
  listQueues(novelId: string): Promise<BatchQueue[]>;
}
```

## 2. 详细设计

### 2.1 数据库Schema

```prisma
// server/prisma/schema.prisma

model BatchQueue {
  id          String   @id @default(cuid())
  novelId     String
  status      QueueStatus @default(PENDING) // PENDING, RUNNING, PAUSED, COMPLETED, FAILED
  config      Json     // { batchSize: 10, maxRetries: 3 }
  totalChapters Int
  completedChapters Int @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  batches Batch[]

  novel Novel @relation(fields: [novelId], references: [id])

  @@index([novelId, status])
}

model Batch {
  id          String   @id @default(cuid())
  queueId     String
  batchIndex  Int      // 批次序号（0开始）
  status      BatchStatus @default(PENDING) // PENDING, RUNNING, COMPLETED, FAILED
  chapters    Json     // [1, 2, 3, ...]
  retryCount  Int      @default(0)
  startedAt   DateTime?
  completedAt DateTime?
  error       String?

  queue BatchQueue @relation(fields: [queueId], references: [id])

  @@index([queueId, batchIndex])
}

enum QueueStatus {
  PENDING
  RUNNING
  PAUSED
  COMPLETED
  FAILED
}

enum BatchStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
}
```

### 2.2 批次分解逻辑

```typescript
function decomposeIntoBatches(
  chapters: number[],
  batchSize: number
): number[][] {
  const batches: number[][] = [];
  for (let i = 0; i < chapters.length; i += batchSize) {
    batches.push(chapters.slice(i, i + batchSize));
  }
  return batches;
}

// 示例：300章，batchSize=10 → 30个批次
// [1-10], [11-20], ..., [291-300]
```

### 2.3 调度器实现

```typescript
// server/src/modules/novel/batch/TaskScheduler.ts

class TaskScheduler {
  private queues: Map<string, BatchQueue> = new Map();
  private isRunning = false;

  async startQueue(queueId: string): Promise<void> {
    const queue = await this.loadQueue(queueId);
    queue.status = 'RUNNING';
    await this.saveQueue(queue);

    this.queues.set(queueId, queue);
    if (!this.isRunning) {
      this.isRunning = true;
      this.run();
    }
  }

  private async run(): Promise<void> {
    while (this.isRunning) {
      for (const [queueId, queue] of this.queues) {
        if (queue.status !== 'RUNNING') continue;

        const nextBatch = await this.getNextBatch(queueId);
        if (!nextBatch) {
          // 批次全部完成
          queue.status = 'COMPLETED';
          await this.saveQueue(queue);
          this.queues.delete(queueId);
          continue;
        }

        await this.executeBatch(nextBatch, queue);
      }

      await this.sleep(1000); // 1秒轮询间隔
    }
  }

  private async executeBatch(batch: Batch, queue: BatchQueue): Promise<void> {
    batch.status = 'RUNNING';
    batch.startedAt = new Date();
    await this.saveBatch(batch);

    try {
      const chapters = batch.chapters as number[];
      for (const chapterIndex of chapters) {
        await this.executeChapter(queue.novelId, chapterIndex);
      }

      batch.status = 'COMPLETED';
      batch.completedAt = new Date();
      queue.completedChapters += chapters.length;
    } catch (error) {
      batch.status = 'FAILED';
      batch.error = error.message;
      batch.retryCount++;

      if (batch.retryCount >= queue.config.maxRetries) {
        // 永久失败，跳过
        queue.completedChapters += (batch.chapters as number[]).length;
      } else {
        // 重试：重新加入队列
        batch.status = 'PENDING';
      }
    }

    await this.saveBatch(batch);
    await this.saveQueue(queue);
  }
}
```

### 2.4 状态查询接口

```typescript
interface BatchQueueStatus {
  queueId: string;
  status: QueueStatus;
  totalChapters: number;
  completedChapters: number;
  progressPercent: number; // 0-100
  currentBatch: number;
  totalBatches: number;
  estimatedRemainingMinutes: number;
  failedTasks: FailedTask[];
}

interface FailedTask {
  chapterIndex: number;
  error: string;
  retryCount: number;
}
```

## 3. 接口设计

### 3.1 HTTP API

```
POST   /api/novels/:novelId/batch/queue
GET    /api/novels/:novelId/batch/queue/:queueId/status
POST   /api/novels/:novelId/batch/queue/:queueId/pause
POST   /api/novels/:novelId/batch/queue/:queueId/resume
DELETE /api/novels/:novelId/batch/queue/:queueId
GET    /api/novels/:novelId/batch/queues
```

### 3.2 请求/响应格式

```typescript
// POST /api/novels/:novelId/batch/queue
interface CreateQueueRequest {
  chapters: number[];      // [1, 2, 3, ...]
  batchSize?: number;       // 默认10
  maxRetries?: number;      // 默认3
}

interface QueueResponse {
  queueId: string;
  totalChapters: number;
  totalBatches: number;
  status: QueueStatus;
}
```

## 4. 实现步骤

### Phase 1: 数据库设计（0.5h）

1. 创建BatchQueue和Batch模型
2. 执行迁移
3. 创建索引

### Phase 2: 服务层实现（1d）

1. 实现BatchQueueService（入队、出队、状态查询）
2. 实现TaskScheduler（调度执行、失败重试）
3. 实现批次分解逻辑

### Phase 3: API层实现（0.5d）

1. 创建HTTP路由
2. 参数校验
3. 错误处理

### Phase 4: 测试（0.5d）

1. 单元测试：批次分解
2. 单元测试：调度逻辑
3. 集成测试：完整流程
4. 压力测试：500任务

## 5. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 批次大小不当 | 效率低下 | 中 | 可配置 + 默认10 |
| 内存溢出 | 服务崩溃 | 低 | 限制队列大小 + 流式处理 |
| 调度死锁 | 任务停滞 | 中 | 超时机制 + 心跳检测 |
| 数据库压力 | 性能下降 | 低 | 批量操作 + 索引优化 |

## 6. 交付物

- [ ] Prisma Schema迁移文件
- [ ] `server/src/modules/novel/batch/BatchQueueService.ts`
- [ ] `server/src/modules/novel/batch/TaskScheduler.ts`
- [ ] `server/src/modules/novel/batch/http/batchRoutes.ts`
- [ ] `server/tests/modules/batch/batchQueueService.test.ts`
- [ ] `server/tests/modules/batch/taskScheduler.test.ts`
