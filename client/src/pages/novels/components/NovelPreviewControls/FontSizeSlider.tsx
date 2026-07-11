import React from 'react';

interface FontSizeSliderProps {
  value: number;
  onChange: (size: number) => void;
}

export const FontSizeSlider = React.memo<FontSizeSliderProps>(
  ({ value, onChange }) => {
    return (
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">字号</label>
        <input
          type="range"
          min={12}
          max={36}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 w-24 cursor-pointer appearance-none rounded bg-border accent-primary"
        />
        <span className="min-w-[3ch] text-center text-xs text-muted-foreground">
          {value}px
        </span>
      </div>
    );
  }
);

FontSizeSlider.displayName = 'FontSizeSlider';
