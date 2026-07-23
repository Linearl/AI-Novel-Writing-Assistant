import React from 'react';
import type { LineHeight } from './types';
import { LINE_HEIGHT_OPTIONS } from './types';

interface LineHeightSelectorProps {
  value: LineHeight;
  onChange: (height: LineHeight) => void;
}

export const LineHeightSelector = React.memo<LineHeightSelectorProps>(
  ({ value, onChange }) => {
    return (
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">行距</label>
        <div className="flex gap-1">
          {LINE_HEIGHT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded px-2 py-1 text-xs transition ${
                value === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-foreground hover:bg-muted'
              }`}
              title={option.description}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }
);

LineHeightSelector.displayName = 'LineHeightSelector';
