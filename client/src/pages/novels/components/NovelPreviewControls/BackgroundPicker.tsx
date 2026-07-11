import React from 'react';
import type { ThemeColors } from './types';
import { THEME_OPTIONS } from './types';

interface BackgroundPickerProps {
  value: ThemeColors;
  onChange: (theme: ThemeColors) => void;
}

export const BackgroundPicker = React.memo<BackgroundPickerProps>(
  ({ value, onChange }) => {
    return (
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">背景</label>
        <div className="flex gap-1">
          {THEME_OPTIONS.map((theme) => (
            <button
              key={theme.label}
              type="button"
              onClick={() => onChange(theme.value)}
              className={`group relative h-6 w-6 rounded border-2 transition-all ${
                value.background === theme.value.background
                  ? 'border-primary scale-110'
                  : 'border-border hover:border-muted-foreground/50'
              }`}
              style={{ backgroundColor: theme.preview }}
              title={theme.label}
            >
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                {theme.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }
);

BackgroundPicker.displayName = 'BackgroundPicker';
