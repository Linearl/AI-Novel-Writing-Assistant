import React, { useEffect, useRef } from 'react';

interface TaskSelectAllProps {
  checked: boolean;
  indeterminate: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const TaskSelectAll = React.memo<TaskSelectAllProps>(
  ({ checked, indeterminate, onChange, disabled = false }) => {
    const checkboxRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (checkboxRef.current) {
        checkboxRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    return (
      <div className="flex items-center gap-2">
        <input
          ref={checkboxRef}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <span className="text-sm text-muted-foreground">选择全部</span>
      </div>
    );
  }
);

TaskSelectAll.displayName = 'TaskSelectAll';
