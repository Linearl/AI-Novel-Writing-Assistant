import React from 'react';

interface WidthSliderProps {
  value: number;
  onChange: (width: number) => void;
}

const PRESETS = [600, 800, 1000];

export const WidthSlider = React.memo<WidthSliderProps>(
  ({ value, onChange }) => {
    return (
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">页宽</label>
        <input
          type="range"
          min={500}
          max={1200}
          step={50}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-2 w-24 cursor-pointer appearance-none rounded bg-border accent-primary"
        />
        <span className="min-w-[4ch] text-center text-xs text-muted-foreground">
          {value}px
        </span>
        <div className="flex gap-1">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              className={`rounded px-1.5 py-0.5 text-[10px] transition-colors ${
                value === preset
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>
    );
  }
);

WidthSlider.displayName = 'WidthSlider';
