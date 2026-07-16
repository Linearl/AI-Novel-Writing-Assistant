/**
 * TensionCurveVolumeContextBar.tsx — 卷上下文栏
 *
 * 显示当前卷的基本信息：卷名、章节数、平均冲突值等。
 */

import React from "react";

// ── Props ─────────────────────────────────────────────────

interface VolumeContext {
  id: string;
  title: string;
  sortOrder: number;
  chapterCount: number;
  avgConflictLevel: number;
  avgRevealLevel: number;
}

interface TensionCurveVolumeContextBarProps {
  volumes: VolumeContext[];
  activeVolumeId?: string | null;
  onVolumeChange?: (volumeId: string) => void;
}

// ── 组件 ──────────────────────────────────────────────────

export default function TensionCurveVolumeContextBar({
  volumes,
  activeVolumeId,
  onVolumeChange,
}: TensionCurveVolumeContextBarProps) {
  if (volumes.length === 0) {
    return (
      <div
        style={{
          padding: "8px 12px",
          fontSize: 12,
          color: "#9ca3af",
          background: "#f9fafb",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        暂无卷数据
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "8px 12px",
        background: "#f9fafb",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        gap: 8,
        overflow: "auto",
      }}
    >
      {volumes.map((volume) => {
        const isActive = volume.id === activeVolumeId;
        return (
          <button
            key={volume.id}
            type="button"
            onClick={() => onVolumeChange?.(volume.id)}
            title={`${volume.title}\n${volume.chapterCount} 章\n平均冲突: ${volume.avgConflictLevel}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 6,
              border: isActive ? "1px solid #6366f1" : "1px solid #e5e7eb",
              background: isActive ? "#eef2ff" : "#fff",
              color: isActive ? "#4338ca" : "#374151",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              whiteSpace: "nowrap",
            }}
          >
            <span>{volume.title}</span>
            <span
              style={{
                fontSize: 10,
                color: isActive ? "#6366f1" : "#9ca3af",
              }}
            >
              {volume.chapterCount}章
            </span>
            <span
              style={{
                fontSize: 10,
                padding: "1px 4px",
                borderRadius: 3,
                background: getAvgColor(volume.avgConflictLevel),
                color: "#fff",
                fontWeight: 600,
              }}
            >
              {volume.avgConflictLevel}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── 工具 ──────────────────────────────────────────────────

function getAvgColor(avg: number): string {
  if (avg <= 30) return "#06b6d4";
  if (avg <= 60) return "#10b981";
  if (avg <= 80) return "#f59e0b";
  return "#ef4444";
}
