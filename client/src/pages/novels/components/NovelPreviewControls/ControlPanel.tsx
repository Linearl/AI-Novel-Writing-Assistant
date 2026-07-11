import React from 'react';
import type { PreviewSettings, PreviewSettingsUpdate } from './types';
import { FontSizeSlider } from './FontSizeSlider';
import { FontSelector } from './FontSelector';
import { BoldToggle } from './BoldToggle';
import { WidthSlider } from './WidthSlider';
import { BackgroundPicker } from './BackgroundPicker';

interface ControlPanelProps {
  settings: PreviewSettings;
  onUpdate: PreviewSettingsUpdate;
  className?: string;
}

export const ControlPanel = React.memo<ControlPanelProps>(
  ({ settings, onUpdate, className }) => {
    return (
      <div
        className={`flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/30 p-3 ${className ?? ''}`}
      >
        <FontSizeSlider
          value={settings.fontSize}
          onChange={onUpdate.fontSize}
        />

        <div className="h-6 w-px bg-border" />

        <FontSelector
          value={settings.fontFamily}
          onChange={onUpdate.fontFamily}
        />

        <div className="h-6 w-px bg-border" />

        <BoldToggle
          checked={settings.isBold}
          onChange={onUpdate.bold}
        />

        <div className="h-6 w-px bg-border" />

        <WidthSlider
          value={settings.pageWidth}
          onChange={onUpdate.pageWidth}
        />

        <div className="h-6 w-px bg-border" />

        <BackgroundPicker
          value={settings.backgroundColor}
          onChange={onUpdate.background}
        />
      </div>
    );
  }
);

ControlPanel.displayName = 'ControlPanel';
