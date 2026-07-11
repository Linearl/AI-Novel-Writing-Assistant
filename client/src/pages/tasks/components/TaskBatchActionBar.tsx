import React from 'react';
import { Button } from '@/components/ui/button';

interface TaskBatchActionBarProps {
  selectedCount: number;
  onBatchCancel: () => void;
  onBatchArchive: () => void;
  isCancelling: boolean;
  isArchiving: boolean;
}

export const TaskBatchActionBar = React.memo<TaskBatchActionBarProps>(
  ({ selectedCount, onBatchCancel, onBatchArchive, isCancelling, isArchiving }) => {
    if (selectedCount === 0) {
      return null;
    }

    return (
      <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <span className="text-sm text-foreground">
          已选中 <span className="font-semibold">{selectedCount}</span> 个任务
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onBatchArchive}
            disabled={isArchiving}
          >
            {isArchiving ? '归档中...' : '批量归档'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={onBatchCancel}
            disabled={isCancelling}
          >
            {isCancelling ? '取消中...' : '批量取消'}
          </Button>
        </div>
      </div>
    );
  }
);

TaskBatchActionBar.displayName = 'TaskBatchActionBar';
