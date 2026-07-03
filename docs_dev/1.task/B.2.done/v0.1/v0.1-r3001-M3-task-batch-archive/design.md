---
description: "REQ-3001 方案设计"
---

# REQ-3001 方案设计

## 1. 方案概述

采用"前端多选状态管理 + 后端批量归档 API"的分层方案。前端在现有 `TaskCenterListPanel` 上叠加 Checkbox 多选能力，通过独立的选中状态 `Set<string>` 管理多选，不影响现有的单选详情查看交互。后端新增批量归档端点，逐个复用现有归档逻辑，单个失败不阻断整体。

### 1.1 设计目标

1. 多选交互零侵入现有单选逻辑——Checkbox 点击与卡片点击分离
2. 批量归档 API 复用现有 `TaskCenterService.archiveTask`，不引入新的归档逻辑
3. 选中状态与筛选联动——切换筛选条件时自动清空，列表刷新时智能保留

### 1.2 关键决策

1. **多选状态存储在 `TaskCenterPage` 而非 `TaskCenterListPanel`**：因为批量归档的 mutation 需要在页面级管理，选中状态提升到页面层更合理
2. **全选仅针对可归档状态**：避免用户误选正在运行的任务导致归档失败
3. **批量归档使用独立端点而非循环调用单任务归档**：减少 HTTP 请求数，统一错误处理
4. **筛选切换清空选中**：最安全的行为，避免选中状态指向不可见任务

### 1.3 不在范围

- 批量重试 / 批量取消
- 跨页多选
- 键盘快捷键多选
- 拖拽归档

## 2. 实现细节

### 2.1 前端

#### 2.1.1 新增类型：`shared/types/task.ts`

```typescript
export interface BatchArchiveTaskItem {
  kind: TaskKind;
  id: string;
}

export interface BatchArchiveRequest {
  tasks: BatchArchiveTaskItem[];
}

export interface BatchArchiveResultItem {
  kind: TaskKind;
  id: string;
  status: "success" | "failed";
  error?: string;
}

export interface BatchArchiveResponse {
  results: BatchArchiveResultItem[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}
```

#### 2.1.2 新增 API 函数：`client/src/api/tasks.ts`

```typescript
export async function batchArchiveTasks(tasks: Array<{ kind: TaskKind; id: string }>) {
  const { data } = await apiClient.post<ApiResponse<BatchArchiveResponse>>(
    "/tasks/batch-archive",
    { tasks },
  );
  return data;
}
```

#### 2.1.3 `TaskCenterListPanel` 改造

位置：`client/src/pages/tasks/components/TaskCenterListPanel.tsx`

新增 props：
```typescript
interface TaskCenterListPanelProps {
  // ...现有 props
  selectedTaskKeys: Set<string>;          // 多选状态集合
  onToggleSelect: (key: string) => void;  // 切换单个选中
  selectableKeys: Set<string>;            // 可被选中的 key 集合
}
```

改造要点：
- 每个任务项增加 `<Checkbox>` 组件（位于卡片左侧）
- Checkbox 的 `checked` 状态从 `selectedTaskKeys.has(key)` 读取
- Checkbox 的 `onCheckedChange` 调用 `onToggleSelect(key)`
- Checkbox 的 `onClick` 需要 `e.stopPropagation()` 阻止冒泡到卡片的 `onClick`（即不影响单选）
- 选中态卡片增加 `border-primary/60 bg-primary/5` 视觉反馈（区别于单选的 `border-primary bg-primary/5`）

#### 2.1.4 新增 `TaskCenterSelectionToolbar` 组件

位置：`client/src/pages/tasks/components/TaskCenterSelectionToolbar.tsx`

职责：
- 显示"已选 N / 共 M 个"计数
- "全选"按钮：将 `visibleRows` 中属于 `ARCHIVABLE_STATUSES` 的任务 key 全部加入 `selectedTaskKeys`
- "取消全选"按钮：清空 `selectedTaskKeys`
- "批量归档 (N)"按钮：触发 `batchArchiveMutation`

#### 2.1.5 `TaskCenterPage` 改造

位置：`client/src/pages/tasks/TaskCenterPage.tsx`

新增状态：
```typescript
const [selectedTaskKeys, setSelectedTaskKeys] = useState<Set<string>>(new Set());
```

新增计算：
```typescript
// 可归档任务的 key 集合（用于全选）
const archivableKeys = useMemo(
  () => new Set(
    visibleRows
      .filter((task) => ARCHIVABLE_STATUSES.has(task.status))
      .map((task) => `${task.kind}:${task.id}`)
  ),
  [visibleRows],
);

// 已选中且可归档的任务列表（用于批量归档 API）
const selectedArchivableTasks = useMemo(
  () => visibleRows
    .filter((task) => selectedTaskKeys.has(`${task.kind}:${task.id}`))
    .filter((task) => ARCHIVABLE_STATUSES.has(task.status))
    .map((task) => ({ kind: task.kind, id: task.id })),
  [visibleRows, selectedTaskKeys],
);
```

新增 mutation：
```typescript
const batchArchiveMutation = useMutation({
  mutationFn: (tasks: Array<{ kind: TaskKind; id: string }>) => batchArchiveTasks(tasks),
  onSuccess: async (response) => {
    const { summary, results } = response.data;
    const failedIds = new Set(
      results.filter((r) => r.status === "failed").map((r) => `${r.kind}:${r.id}`)
    );
    // 清空成功项的选中状态
    setSelectedTaskKeys((prev) => {
      const next = new Set(prev);
      for (const key of next) {
        if (!failedIds.has(key)) {
          next.delete(key);
        }
      }
      return next;
    });
    await invalidateTaskQueries();
    if (summary.failed === 0) {
      toast.success(`已成功归档 ${summary.succeeded} 个任务`);
    } else {
      toast.warning(`已归档 ${summary.succeeded} 个任务，${summary.failed} 个归档失败`);
    }
  },
});
```

筛选联动清空：
```typescript
// 在 kind / status / keyword / onlyAnomaly / sortMode 变化时清空选中
useEffect(() => {
  setSelectedTaskKeys(new Set());
}, [kind, status, keyword, onlyAnomaly, sortMode]);
```

列表刷新时清理失效选中项：
```typescript
useEffect(() => {
  const currentKeys = new Set(
    visibleRows.map((task) => `${task.kind}:${task.id}`)
  );
  setSelectedTaskKeys((prev) => {
    const next = new Set([...prev].filter((key) => currentKeys.has(key)));
    return next.size === prev.size ? prev : next;
  });
}, [visibleRows]);
```

### 2.2 后端

#### 2.2.1 新增路由：`server/src/routes/tasks.ts`

```typescript
const batchArchiveBodySchema = z.object({
  tasks: z.array(z.object({
    kind: kindSchema,
    id: z.string().trim().min(1),
  })).min(1).max(80),
});

router.post("/batch-archive",
  validate({ body: batchArchiveBodySchema }),
  async (req, res) => {
    const { tasks } = req.body;
    const results = [];
    for (const task of tasks) {
      try {
        await taskCenterService.archiveTask(task.kind, task.id);
        results.push({ kind: task.kind, id: task.id, status: "success" as const });
      } catch (error) {
        results.push({
          kind: task.kind,
          id: task.id,
          status: "failed" as const,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
    const summary = {
      total: results.length,
      succeeded: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "failed").length,
    };
    res.json({ success: true, data: { results, summary } });
  }
);
```

### 2.3 共享

#### 2.3.1 新增类型：`shared/types/task.ts`

追加 `BatchArchiveRequest`、`BatchArchiveResultItem`、`BatchArchiveResponse` 类型定义（见 2.1.1）。

## 3. 接口定义

### 3.1 新增接口

| 方法 | 路径 | 说明 | Content-Type |
| ---- | ---- | ---- | ------------ |
| POST | `/api/tasks/batch-archive` | 批量归档多个任务 | `application/json` |

### 3.2 请求示例

```json
{
  "tasks": [
    { "kind": "novel_workflow", "id": "abc-123" },
    { "kind": "book_analysis", "id": "def-456" },
    { "kind": "novel_workflow", "id": "ghi-789" }
  ]
}
```

### 3.3 响应示例

```json
{
  "success": true,
  "data": {
    "results": [
      { "kind": "novel_workflow", "id": "abc-123", "status": "success" },
      { "kind": "book_analysis", "id": "def-456", "status": "success" },
      { "kind": "novel_workflow", "id": "ghi-789", "status": "failed", "error": "Task not found" }
    ],
    "summary": { "total": 3, "succeeded": 2, "failed": 1 }
  }
}
```

## 4. 数据模型

无数据库 schema 变更。批量归档完全复用现有 `TaskCenterService.archiveTask` 逻辑。

## 5. 异常处理

| 错误码 | 场景 | 处理方式 |
| ---- | ---- | -------- |
| 400 | tasks 数组为空或超过 80 个 | 返回参数校验错误 |
| 单个失败 | 任务不存在或状态不允许归档 | 跳过该任务，在 results 中标记 failed |
| 500 | 数据库异常 | 返回 500，前端 Toast 错误提示 |

## 6. 验证策略

1. 创建多个不同状态的任务（succeeded / failed / cancelled / running）
2. 勾选多个可归档任务，点击批量归档
3. 验证确认对话框显示正确的数量
4. 验证归档完成后列表刷新、选中状态清空
5. 验证全选仅选中可归档状态的任务
6. 验证切换筛选条件后选中状态被清空
7. 验证单个任务归档失败不影响其他任务
