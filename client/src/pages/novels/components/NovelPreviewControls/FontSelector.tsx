import React from 'react';
import type { FontFamily } from './types';
import { FONT_OPTIONS } from './types';

interface FontSelectorProps {
  value: FontFamily;
  onChange: (family: FontFamily) => void;
}

export const FontSelector = React.memo<FontSelectorProps>(
  ({ value, onChange }) => {
    return (
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">字体</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as FontFamily)}
          className="rounded border border-border bg-background px-2 py-1 text-xs"
        >
          {FONT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

FontSelector.displayName = 'FontSelector';
