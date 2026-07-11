# 任务中心批量操作功能 - 设计文档

## 架构设计

### 组件层次

```
TaskCenterPage (状态管理)
  └── TaskCenterListPanel (列表容器)
        ├── TaskSelectAll (全选框)
        ├── TaskItem (每个任务项)
        │     └── TaskCheckbox (单选框)
        └── TaskBatchActionBar (批量操作栏)
```

### 状态设计

```typescript
// TaskCenterPage 中的状态
const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

// 清除选中状态的时机
useEffect(() => {
  setSelectedTaskIds(new Set());
}, [listParamsKey]); // 筛选条件变化时
```

### 数据流

1. 用户点击复选框 → TaskCheckbox → onSelectionChange
2. 用户点击全选框 → TaskSelectAll → onSelectionChange
3. 状态更新 → TaskCenterPage 重新渲染
4. 用户点击批量取消 → TaskBatchActionBar → onBatchCancel
5. 调用 API → 逐个取消 → 刷新列表

## UI 设计

### 任务项布局

```
[复选框] [任务标题]              [状态徽章]
         类型 | 进度 XX%
         阶段：... | 当前项：...
```

### 全选框布局

```
[全选框] 选择全部
```

### 批量操作栏布局

```
已选中 3 个任务 | [批量取消]
```

## API 调用

### 批量取消

```typescript
// 逐个取消，非并发
for (const taskId of selectedTaskIds) {
  try {
    await cancelTask(taskKind, taskId);
    successCount++;
  } catch (error) {
    failureCount++;
    // 记录失败的任务
  }
}
```

### 可取消状态判断

```typescript
const canCancelStatuses = new Set(['queued', 'waiting_approval']);
const isCancellable = canCancelStatuses.has(task.status);
```

## 边界情况

1. **无可取消任务**: 提示用户"选中的任务中没有可取消的"
2. **部分任务取消失败**: 提示"成功取消 X 个，Y 个取消失败"
3. **全部任务取消失败**: 提示"取消操作失败，请重试"
4. **任务列表为空**: 不显示全选框和批量操作栏
5. **正在运行的任务**: 不可取消，自动跳过

## 代码位置

- 新增组件: `client/src/pages/tasks/components/TaskCenter*`
- 修改文件: `client/src/pages/tasks/TaskCenterPage.tsx`
- 工具函数: `client/src/pages/tasks/taskCenterUtils.ts`

## 依赖

- 现有 UI 组件: Checkbox, Button, Badge, Card
- API 函数: cancelTask (已存在)
- 类型定义: UnifiedTaskSummary (已存在)
