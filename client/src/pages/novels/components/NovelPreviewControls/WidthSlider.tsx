import React from 'react';

interface WidthSliderProps {
  value: number;
  autoFit: boolean;
  onChange: (width: number) => void;
  onAutoFitChange: () => void;
}

const PRESETS = [800, 1200, 1600, 2400, 3200, 4000];

export const WidthSlider = React.memo<WidthSliderProps>(
  ({ value, autoFit, onChange, onAutoFitChange }) => {
    return (
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-muted-foreground">页宽</label>
        <input
          type="range"
          min={500}
          max={4000}
          step={50}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={autoFit}
          className="h-2 w-24 cursor-pointer appearance-none rounded bg-border accent-primary disabled:cursor-not-allowed disabled:opacity-50"
        />
        <span className="min-w-[4ch] text-center text-xs text-muted-foreground">
          {autoFit ? '自适应' : `${value}px`}
        </span>
        <div className="flex gap-1">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              disabled={autoFit}
              className={`rounded px-1.5 py-0.5 text-[10px] transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                value === preset && !autoFit
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-border" />
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={autoFit}
            onChange={onAutoFitChange}
            className="h-3.5 w-3.5 rounded border-border accent-primary"
          />
          自适应铺满
        </label>
      </div>
    );
  }
);

WidthSlider.displayName = 'WidthSlider';
