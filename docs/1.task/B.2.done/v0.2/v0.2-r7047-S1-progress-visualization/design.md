---
description: "REQ-7047: 进度可视化 — 技术设计"
update_time: "2026-07-11"
status: todo
---

# REQ-7047: 进度可视化 — 技术设计

## 1. 架构设计

### 1.1 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    前端 (React)                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ProgressVisualization 组件                      │   │
│  │  - 进度条                                        │   │
│  │  - 当前章节信息                                  │   │
│  │  - 预计剩余时间                                  │   │
│  │  - 已用时间                                      │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    后端 (Express)                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Progress API                                    │   │
│  │  - GET /progress/:queueId                        │   │
│  └──────────────────────────────────────────────────┘   │
│                          │                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ProgressService                                │   │
│  │  - 计算进度百分比                                │   │
│  │  - 估算剩余时间                                  │   │
│  │  - 获取当前章节信息                              │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### 1.2 核心组件

```typescript
// server/src/modules/novel/progress/ProgressService.ts

interface ProgressService {
  // 获取进度信息
  getProgress(queueId: string): Promise<ProgressInfo>;

  // 计算预计剩余时间
  estimateRemainingTime(queueId: string): Promise<number>;
}

interface ProgressInfo {
  queueId: string;
  totalChapters: number;
  completedChapters: number;
  progressPercent: number; // 0-100
  currentChapter: {
    index: number;
    title?: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
  };
  estimatedRemainingMinutes: number;
  elapsedMinutes: number;
  failedCount: number;
  batchSize: number;
  currentBatch: number;
  totalBatches: number;
}
```

## 2. 详细设计

### 2.1 进度计算逻辑

```typescript
async function getProgress(queueId: string): Promise<ProgressInfo> {
  // 1. 获取队列信息
  const queue = await prisma.batchQueue.findUnique({
    where: { id: queueId },
    include: { batches: true },
  });

  if (!queue) throw new Error('Queue not found');

  // 2. 计算进度百分比
  const progressPercent = (queue.completedChapters / queue.totalChapters) * 100;

  // 3. 获取当前批次信息
  const currentBatch = await prisma.batch.findFirst({
    where: { queueId, status: 'RUNNING' },
    orderBy: { batchIndex: 'asc' },
  });

  // 4. 获取当前章节
  const currentChapter = currentBatch
    ? {
        index: getCurrentChapterIndex(currentBatch),
        title: await getChapterTitle(queue.novelId, getCurrentChapterIndex(currentBatch)),
        status: 'running',
      }
    : { index: 0, status: 'pending' };

  // 5. 计算预计剩余时间
  const estimatedRemainingMinutes = await estimateRemainingTime(queue);

  // 6. 计算已用时间
  const elapsedMinutes = (Date.now() - queue.createdAt.getTime()) / 60000;

  // 7. 计算失败任务数
  const failedCount = queue.batches.filter((b) => b.status === 'FAILED').length;

  // 8. 计算批次信息
  const totalBatches = queue.batches.length;
  const currentBatchIndex = currentBatch?.batchIndex ?? 0;

  return {
    queueId,
    totalChapters: queue.totalChapters,
    completedChapters: queue.completedChapters,
    progressPercent,
    currentChapter,
    estimatedRemainingMinutes,
    elapsedMinutes,
    failedCount,
    batchSize: queue.config.batchSize,
    currentBatch: currentBatchIndex,
    totalBatches,
  };
}
```

### 2.2 剩余时间估算

```typescript
async function estimateRemainingTime(queue: BatchQueue): Promise<number> {
  // 1. 获取最近10章的执行时间
  const recentChapters = await getRecentChapterTimes(queue.id, 10);

  if (recentChapters.length === 0) {
    // 无历史数据，使用默认估算（每章2分钟）
    const remaining = queue.totalChapters - queue.completedChapters;
    return remaining * 2;
  }

  // 2. 计算平均执行时间
  const avgTimePerChapter = recentChapters.reduce((a, b) => a + b, 0) / recentChapters.length;

  // 3. 计算剩余章节数
  const remaining = queue.totalChapters - queue.completedChapters;

  // 4. 估算剩余时间
  return remaining * avgTimePerChapter;
}

async function getRecentChapterTimes(queueId: string, count: number): Promise<number[]> {
  // 从已完成的批次中获取最近的执行时间
  const completedBatches = await prisma.batch.findMany({
    where: { queueId, status: 'COMPLETED' },
    orderBy: { completedAt: 'desc' },
    take: Math.ceil(count / 10), // 每批次约10章
  });

  const times: number[] = [];
  for (const batch of completedBatches) {
    if (batch.startedAt && batch.completedAt) {
      const batchTime = (batch.completedAt.getTime() - batch.startedAt.getTime()) / 60000;
      const chapterTime = batchTime / (batch.chapters as number[]).length;
      times.push(chapterTime);
    }
  }

  return times.slice(0, count);
}
```

### 2.3 前端组件

```tsx
// client/src/components/ProgressVisualization/ProgressVisualization.tsx

interface ProgressVisualizationProps {
  queueId: string;
  refreshInterval?: number; // 默认1000ms
}

export function ProgressVisualization({ queueId, refreshInterval = 1000 }: ProgressVisualizationProps) {
  const [progress, setProgress] = useState<ProgressInfo | null>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      const response = await fetch(`/api/progress/${queueId}`);
      const data = await response.json();
      setProgress(data);
    };

    fetchProgress();
    const interval = setInterval(fetchProgress, refreshInterval);

    return () => clearInterval(interval);
  }, [queueId, refreshInterval]);

  if (!progress) return <div>Loading...</div>;

  return (
    <div className="progress-visualization">
      {/* 进度条 */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress.progressPercent}%` }} />
        <span className="progress-text">{progress.progressPercent.toFixed(1)}%</span>
      </div>

      {/* 当前章节 */}
      <div className="current-chapter">
        当前：第{progress.currentChapter.index}章
        {progress.currentChapter.title && ` - ${progress.currentChapter.title}`}
      </div>

      {/* 批次信息 */}
      <div className="batch-info">
        批次：{progress.currentBatch + 1} / {progress.totalBatches}
      </div>

      {/* 时间信息 */}
      <div className="time-info">
        <div>已用时间：{formatTime(progress.elapsedMinutes)}</div>
        <div>预计剩余：{formatTime(progress.estimatedRemainingMinutes)}</div>
      </div>

      {/* 失败任务 */}
      {progress.failedCount > 0 && (
        <div className="failed-count">
          失败任务：{progress.failedCount}
        </div>
      )}
    </div>
  );
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (hours > 0) {
    return `${hours}小时${mins}分钟`;
  }
  return `${mins}分钟`;
}
```

## 3. 接口设计

### 3.1 HTTP API

```
GET    /api/progress/:queueId
```

### 3.2 响应格式

```typescript
interface ProgressResponse {
  queueId: string;
  totalChapters: number;
  completedChapters: number;
  progressPercent: number;
  currentChapter: {
    index: number;
    title: string | null;
    status: string;
  };
  estimatedRemainingMinutes: number;
  elapsedMinutes: number;
  failedCount: number;
  batchSize: number;
  currentBatch: number;
  totalBatches: number;
}
```

## 4. 实现步骤

### Phase 1: 服务层实现（0.5d）

1. 实现ProgressService
2. 实现进度计算逻辑
3. 实现剩余时间估算

### Phase 2: API层实现（0.5d）

1. 创建HTTP路由
2. 参数校验
3. 错误处理

### Phase 3: 前端组件（0.5d）

1. 实现ProgressVisualization组件
2. 实现进度条
3. 实现时间格式化

### Phase 4: 测试（0.5d）

1. 单元测试：进度计算
2. 单元测试：时间估算
3. 集成测试：完整流程
4. UI测试：组件渲染

## 5. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 进度计算不准确 | 用户困惑 | 中 | 基于历史数据 + 动态调整 |
| 界面卡顿 | 用户体验差 | 低 | 优化渲染 + 虚拟列表 |
| 轮询频率过高 | 服务器压力 | 低 | 默认1秒 + 可配置 |

## 6. 交付物

- [ ] `server/src/modules/novel/progress/ProgressService.ts`
- [ ] `server/src/modules/novel/progress/http/progressRoutes.ts`
- [ ] `client/src/components/ProgressVisualization/ProgressVisualization.tsx`
- [ ] `server/tests/modules/progress/progressService.test.ts`
