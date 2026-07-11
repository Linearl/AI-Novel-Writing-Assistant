import React from 'react';

interface TaskCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const TaskCheckbox = React.memo<TaskCheckboxProps>(
  ({ checked, onChange, disabled = false }) => {
    return (
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }
);

TaskCheckbox.displayName = 'TaskCheckbox';
