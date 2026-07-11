import type { UnifiedTaskSummary } from "@ai-novel/shared";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatCheckpoint,
  formatDate,
  formatKind,
  formatStatus,
  toStatusVariant,
} from "../taskCenterUtils";
import { TaskCheckbox } from "./TaskCheckbox";
import { TaskSelectAll } from "./TaskSelectAll";
import { TaskBatchActionBar } from "./TaskBatchActionBar";

interface TaskCenterListPanelProps {
  tasks: UnifiedTaskSummary[];
  selectedKind: string | null;
  selectedId: string | null;
  onSelectTask: (task: UnifiedTaskSummary) => void;
  selectedTaskIds: Set<string>;
  onSelectionChange: (taskIds: Set<string>) => void;
  onBatchCancel: () => void;
  onBatchArchive: () => void;
  isCancelling: boolean;
  isArchiving: boolean;
}

export default function TaskCenterListPanel({
  tasks,
  selectedKind,
  selectedId,
  onSelectTask,
  selectedTaskIds,
  onSelectionChange,
  onBatchCancel,
  onBatchArchive,
  isCancelling,
  isArchiving,
}: TaskCenterListPanelProps) {
  const allSelected = tasks.length > 0 && tasks.every((task) => selectedTaskIds.has(`${task.kind}:${task.id}`));
  const someSelected = tasks.some((task) => selectedTaskIds.has(`${task.kind}:${task.id}`));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(tasks.map((task) => `${task.kind}:${task.id}`));
      onSelectionChange(allIds);
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectTask = (task: UnifiedTaskSummary, checked: boolean) => {
    const taskKey = `${task.kind}:${task.id}`;
    const newSelected = new Set(selectedTaskIds);
    if (checked) {
      newSelected.add(taskKey);
    } else {
      newSelected.delete(taskKey);
    }
    onSelectionChange(newSelected);
  };

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">任务列表</CardTitle>
          {tasks.length > 0 && (
            <TaskSelectAll
              checked={allSelected}
              indeterminate={someSelected && !allSelected}
              onChange={handleSelectAll}
            />
          )}
        </div>
        <TaskBatchActionBar
          selectedCount={selectedTaskIds.size}
          onBatchCancel={onBatchCancel}
          onBatchArchive={onBatchArchive}
          isCancelling={isCancelling}
          isArchiving={isArchiving}
        />
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.map((task) => {
          const isSelected = task.kind === selectedKind && task.id === selectedId;
          const taskKey = `${task.kind}:${task.id}`;
          const isTaskSelected = selectedTaskIds.has(taskKey);
          return (
            <div
              key={taskKey}
              className={`flex items-start gap-3 rounded-md border p-3 transition-colors ${
                isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/40"
              }`}
            >
              <TaskCheckbox
                checked={isTaskSelected}
                onChange={(checked) => handleSelectTask(task, checked)}
              />
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onSelectTask(task)}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{task.title}</div>
                  <Badge variant={toStatusVariant(task.status)}>{formatStatus(task.status)}</Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {formatKind(task.kind)} | 进度 {Math.round(task.progress * 100)}%
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  阶段：{task.currentStage ?? "暂无"} | 当前项：{task.currentItemLabel ?? "暂无"}
                </div>
                {task.displayStatus || task.lastHealthyStage ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    状态：{task.displayStatus ?? formatStatus(task.status)} | 最近健康阶段：{task.lastHealthyStage ?? "暂无"}
                  </div>
                ) : null}
                {task.kind === "novel_workflow" ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    检查点：{formatCheckpoint(task.checkpointType, task.executionScopeLabel)} | 建议继续：{task.resumeAction ?? task.nextActionLabel ?? "继续主流程"}
                  </div>
                ) : null}
                {task.blockingReason ? (
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    原因：{task.blockingReason}
                  </div>
                ) : null}
                <div className="mt-1 text-xs text-muted-foreground">
                  最近心跳：{formatDate(task.heartbeatAt)} | 更新时间：{formatDate(task.updatedAt)}
                </div>
              </button>
            </div>
          );
        })}
        {tasks.length === 0 ? (
          <EmptyState variant="dashed" className="rounded-md p-6">
            当前没有符合条件的任务。
          </EmptyState>
        ) : null}
      </CardContent>
    </Card>
  );
}
