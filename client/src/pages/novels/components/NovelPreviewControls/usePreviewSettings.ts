import { useCallback, useMemo, useState } from 'react';
import type { FontFamily, PreviewSettings, ThemeColors } from './types';
import { DEFAULT_PREVIEW_SETTINGS } from './types';

const STORAGE_KEY = 'novel-preview-settings';

/** 从 localStorage 加载设置 */
function loadSettings(): PreviewSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_PREVIEW_SETTINGS;
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...DEFAULT_PREVIEW_SETTINGS,
        ...parsed,
        backgroundColor: {
          ...DEFAULT_PREVIEW_SETTINGS.backgroundColor,
          ...parsed.backgroundColor,
        },
      };
    }
  } catch {
    // 忽略解析错误
  }

  return DEFAULT_PREVIEW_SETTINGS;
}

/** 保存设置到 localStorage */
function saveSettings(settings: PreviewSettings): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 忽略存储错误
  }
}

/** usePreviewSettings Hook */
export function usePreviewSettings() {
  const [settings, setSettings] = useState<PreviewSettings>(loadSettings);

  const updateFontSize = useCallback((size: number) => {
    const clamped = Math.max(12, Math.min(36, size));
    setSettings((prev) => {
      const next = { ...prev, fontSize: clamped };
      saveSettings(next);
      return next;
    });
  }, []);

  const updateFontFamily = useCallback((family: FontFamily) => {
    setSettings((prev) => {
      const next = { ...prev, fontFamily: family };
      saveSettings(next);
      return next;
    });
  }, []);

  const toggleBold = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, isBold: !prev.isBold };
      saveSettings(next);
      return next;
    });
  }, []);

  const updatePageWidth = useCallback((width: number) => {
    const clamped = Math.max(500, Math.min(1200, width));
    setSettings((prev) => {
      const next = { ...prev, pageWidth: clamped };
      saveSettings(next);
      return next;
    });
  }, []);

  const updateBackground = useCallback((theme: ThemeColors) => {
    setSettings((prev) => {
      const next = { ...prev, backgroundColor: theme };
      saveSettings(next);
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_PREVIEW_SETTINGS);
    saveSettings(DEFAULT_PREVIEW_SETTINGS);
  }, []);

  const updateCallbacks = useMemo(
    () => ({
      fontSize: updateFontSize,
      fontFamily: updateFontFamily,
      bold: toggleBold,
      pageWidth: updatePageWidth,
      background: updateBackground,
    }),
    [updateFontSize, updateFontFamily, toggleBold, updatePageWidth, updateBackground]
  );

  return useMemo(
    () => ({
      settings,
      onUpdate: updateCallbacks,
      resetToDefaults,
    }),
    [settings, updateCallbacks, resetToDefaults]
  );
}
