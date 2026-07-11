import React from 'react';

interface BoldToggleProps {
  checked: boolean;
  onChange: () => void;
}

export const BoldToggle = React.memo<BoldToggleProps>(
  ({ checked, onChange }) => {
    return (
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">加粗</label>
        <button
          type="button"
          onClick={onChange}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            checked ? 'bg-primary' : 'bg-border'
          }`}
        >
          <span
            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
              checked ? 'translate-x-5' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-xs text-muted-foreground">
          {checked ? '开' : '关'}
        </span>
      </div>
    );
  }
);

BoldToggle.displayName = 'BoldToggle';
