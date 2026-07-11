import React from 'react';
import { Button } from '@/components/ui/button';

interface TaskBatchActionBarProps {
  selectedCount: number;
  onBatchCancel: () => void;
  isCancelling: boolean;
}

export const TaskBatchActionBar = React.memo<TaskBatchActionBarProps>(
  ({ selectedCount, onBatchCancel, isCancelling }) => {
    if (selectedCount === 0) {
      return null;
    }

    return (
      <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
        <span className="text-sm text-foreground">
          已选中 <span className="font-semibold">{selectedCount}</span> 个任务
        </span>
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
    );
  }
);

TaskBatchActionBar.displayName = 'TaskBatchActionBar';
