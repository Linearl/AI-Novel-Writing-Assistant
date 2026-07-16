/**
 * TensionCurveEditDialog.tsx — 冲突值精确编辑对话框
 *
 * 点击节点后弹出，支持：
 * - 数值滑块（0-100）
 * - 预设档位选择
 * - 保存/取消
 */

import React, { useCallback, useEffect, useState } from "react";
import type { Chapter } from "@ai-novel/shared";

// ── Props ─────────────────────────────────────────────────

interface TensionCurveEditDialogProps {
  chapter: Chapter;
  currentValue: number;
  onSave: (chapterId: string, newValue: number) => void;
  onClose: () => void;
}

// ── 预设档位 ──────────────────────────────────────────────

const PRESET_LEVELS = [
  { label: "极低", value: 10, desc: "几乎没有冲突" },
  { label: "低", value: 25, desc: "日常场景或过渡" },
  { label: "中低", value: 45, desc: "温和矛盾" },
  { label: "中", value: 55, desc: "正常冲突" },
  { label: "中高", value: 70, desc: "明显对抗" },
  { label: "高", value: 85, desc: "激烈冲突" },
  { label: "极高", value: 95, desc: "高潮/重大转折" },
];

// ── 组件 ──────────────────────────────────────────────────

export default function TensionCurveEditDialog({
  chapter,
  currentValue,
  onSave,
  onClose,
}: TensionCurveEditDialogProps) {
  const [value, setValue] = useState(currentValue);

  useEffect(() => {
    setValue(currentValue);
  }, [currentValue]);

  const handleSave = useCallback(() => {
    onSave(chapter.id, value);
    onClose();
  }, [chapter.id, value, onSave, onClose]);

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter") handleSave();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, handleSave]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.3)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "20px 24px",
          minWidth: 340,
          maxWidth: 420,
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题 */}
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
            编辑冲突值
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
            Ch.{chapter.order}: {chapter.title || "未命名章节"}
          </p>
        </div>

        {/* 滑块 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>0</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: getValueColor(value) }}>
              {value}
            </span>
            <span style={{ fontSize: 12, color: "#9ca3af" }}>100</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            style={{
              width: "100%",
              accentColor: "#6366f1",
              cursor: "pointer",
            }}
          />
        </div>

        {/* 预设档位 */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#9ca3af" }}>
            快速档位
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {PRESET_LEVELS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setValue(preset.value)}
                title={preset.desc}
                style={{
                  fontSize: 11,
                  padding: "3px 8px",
                  borderRadius: 4,
                  border: value === preset.value ? "2px solid #6366f1" : "1px solid #e5e7eb",
                  background: value === preset.value ? "#eef2ff" : "#fff",
                  color: value === preset.value ? "#4338ca" : "#374151",
                  cursor: "pointer",
                  fontWeight: value === preset.value ? 600 : 400,
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* 操作按钮 */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              fontSize: 13,
              padding: "6px 16px",
              borderRadius: 6,
              border: "1px solid #e5e7eb",
              background: "#fff",
              color: "#374151",
              cursor: "pointer",
            }}
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              fontSize: 13,
              padding: "6px 16px",
              borderRadius: 6,
              border: "none",
              background: "#6366f1",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 工具 ──────────────────────────────────────────────────

function getValueColor(value: number): string {
  if (value <= 20) return "#3b82f6";
  if (value <= 40) return "#06b6d4";
  if (value <= 60) return "#10b981";
  if (value <= 75) return "#f59e0b";
  if (value <= 90) return "#f97316";
  return "#ef4444";
}
