---
description: "REQ-7052: 后台任务管理 — 技术设计"
update_time: "2026-07-11"
status: todo
---

# REQ-7052: 后台任务管理 — 技术设计

## 1. 架构设计

### 1.1 实现位置

在 `server/src/services/` 下新增 `BackgroundTaskManager` 服务模块，负责任务的提交、状态管理、执行调度。

```
调用链路：
客户端 POST /api/tasks  →  TaskController
  ↓
BackgroundTaskManager.submit()  // 任务提交
  ↓
TaskRunner.execute()  // 后台异步执行
  ↓
状态变更 → SSE推送 → 客户端
```

### 1.2 核心组件

```typescript
// 新增文件：server/src/services/backgroundTask/types.ts

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';

export type TaskType = 'chapter_generation' | 'character_setup' | 'world_building' | 'full_execution';

export interface TaskRecord {
  id: string;
  novelId: string;
  type: TaskType;
  status: TaskStatus;
  progress: number;        // 0-100
  params: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  pausedAt?: Date;
}

export interface TaskCheckpoint {
  taskId: string;
  stepIndex: number;
  data: Record<string, unknown>;
  timestamp: Date;
}
```

```typescript
// 新增文件：server/src/services/backgroundTask/manager.ts

export class BackgroundTaskManager {
  private runningTasks: Map<string, TaskRunner> = new Map();
  private readonly maxConcurrent = 5;

  async submit(novelId: string, type: TaskType, params: Record<string, unknown>): Promise<TaskRecord>;
  async getStatus(taskId: string): Promise<TaskRecord | null>;
  async listByNovel(novelId: string, filter?: TaskFilter): Promise<TaskRecord[]>;
  async pause(taskId: string): Promise<void>;
  async resume(taskId: string): Promise<void>;
  async cancel(taskId: string): Promise<void>;
}
```

```typescript
// 新增文件：server/src/services/backgroundTask/runner.ts

export class TaskRunner {
  constructor(private task: TaskRecord, private manager: BackgroundTaskManager);

  async execute(): Promise<void>;
  private async saveCheckpoint(stepIndex: number, data: Record<string, unknown>): Promise<void>;
  private async restoreFromCheckpoint(): Promise<TaskCheckpoint | null>;
  async pause(): Promise<void>;
  async resume(): Promise<void>;
  async cancel(): Promise<void>;
}
```

## 2. 详细设计

### 2.1 任务状态机

```
pending → running → completed
                ↘ failed
running → paused → running (resume)
running → cancelled
paused → cancelled
```

状态转换规则：
- `pending → running`: 任务开始执行
- `running → completed`: 任务正常完成
- `running → failed`: 任务执行失败
- `running → paused`: 用户暂停
- `paused → running`: 用户恢复
- `running/paused → cancelled`: 用户取消

### 2.2 暂停点机制

```typescript
// 暂停点保存示例
class ChapterGenerationTask implements TaskExecutable {
  async execute(checkpoint?: TaskCheckpoint): Promise<TaskResult> {
    const startStep = checkpoint?.stepIndex ?? 0;
    const context = checkpoint?.data ?? {};

    for (let step = startStep; step < this.steps.length; step++) {
      // 检查是否需要暂停
      if (await this.shouldPause()) {
        await this.saveCheckpoint(step, context);
        return { status: 'paused' };
      }

      // 执行步骤
      context[step] = await this.steps[step].execute(context);
    }

    return { status: 'completed', data: context };
  }
}
```

### 2.3 SSE实时状态推送

```typescript
// 新增文件：server/src/services/backgroundTask/sseManager.ts

export class TaskSSEManager {
  private connections: Map<string, Set<SSEConnection>> = new Map();

  subscribe(taskId: string, connection: SSEConnection): void;
  unsubscribe(taskId: string, connection: SSEConnection): void;
  broadcast(taskId: string, event: TaskEvent): void;
  broadcastByNovel(novelId: string, event: TaskEvent): void;
}

// SSE连接接口
interface SSEConnection {
  write(data: string): void;
  end(): void;
}
```

### 2.4 API设计

```
POST   /api/novels/:novelId/tasks          - 提交任务
GET    /api/novels/:novelId/tasks           - 查询任务列表
GET    /api/tasks/:taskId                   - 查询任务状态
POST   /api/tasks/:taskId/pause             - 暂停任务
POST   /api/tasks/:taskId/resume            - 恢复任务
POST   /api/tasks/:taskId/cancel            - 取消任务
GET    /api/tasks/:taskId/stream             - SSE状态流
```

## 3. 数据模型

### 3.1 数据库表

```sql
-- 后台任务表
CREATE TABLE background_tasks (
  id TEXT PRIMARY KEY,
  novel_id TEXT NOT NULL REFERENCES novels(id),
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  params TEXT,  -- JSON序列化
  result TEXT,  -- JSON序列化
  error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  paused_at DATETIME
);

-- 任务检查点表
CREATE TABLE task_checkpoints (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES background_tasks(id),
  step_index INTEGER NOT NULL,
  data TEXT NOT NULL,  -- JSON序列化
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 4. 接口设计

### 4.1 前端接口

```typescript
// 新增文件：client/src/api/tasks.ts

export const taskApi = {
  submit: (novelId: string, params: SubmitTaskParams) => api.post(`/novels/${novelId}/tasks`, params),
  getStatus: (taskId: string) => api.get(`/tasks/${taskId}`),
  listByNovel: (novelId: string, filter?: TaskFilter) => api.get(`/novels/${novelId}/tasks`, { params: filter }),
  pause: (taskId: string) => api.post(`/tasks/${taskId}/pause`),
  resume: (taskId: string) => api.post(`/tasks/${taskId}/resume`),
  cancel: (taskId: string) => api.post(`/tasks/${taskId}/cancel`),
  subscribe: (taskId: string) => new EventSource(`/api/tasks/${taskId}/stream`),
};
```

## 5. 实现步骤

### Phase 1: 核心数据模型和状态管理（0.25天）

1. 创建数据库迁移（background_tasks、task_checkpoints表）
2. 实现BackgroundTaskManager核心逻辑
3. 实现状态机转换

### Phase 2: 任务执行和暂停点（0.25天）

1. 实现TaskRunner和暂停点机制
2. 集成到现有任务类型
3. 实现检查点保存和恢复

### Phase 3: API和SSE（0.25天）

1. 实现REST API端点
2. 实现SSE状态推送
3. 前端API层和数据订阅

### Phase 4: 测试（0.25天）

1. 单元测试：状态机、暂停点
2. 集成测试：API端点
3. 端到端测试：完整流程

## 6. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 暂停点实现复杂 | 开发延迟 | 中 | 分阶段实现，先支持简单暂停 |
| SSE连接管理 | 内存泄漏 | 低 | 连接超时清理+异常处理 |
| 并发控制 | 数据竞争 | 中 | 数据库锁+乐观并发控制 |

## 7. 测试计划

### 7.1 单元测试

```typescript
describe('BackgroundTaskManager', () => {
  it('should submit task and return immediately');
  it('should track task status transitions');
  it('should enforce concurrent task limit');
  it('should pause and resume task correctly');
  it('should cancel task and cleanup resources');
});

describe('TaskRunner', () => {
  it('should save checkpoint on pause');
  it('should restore from checkpoint on resume');
  it('should execute steps in order');
});
```

### 7.2 集成测试

```typescript
describe('Task API', () => {
  it('should submit and query task status');
  it('should stream status updates via SSE');
  it('should handle pause/resume lifecycle');
});
```

## 8. 交付物

- [ ] `server/src/services/backgroundTask/` - 服务目录
- [ ] 数据库迁移文件
- [ ] REST API端点
- [ ] SSE状态推送
- [ ] `client/src/api/tasks.ts` - 前端API
- [ ] 单元测试和集成测试
