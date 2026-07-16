/**
 * TensionCurveBeatContextStrip.tsx — 节拍上下文条
 *
 * 显示当前悬停章节对应的节拍信息（如果存在）。
 * 位于画布下方，显示节拍类型、描述等。
 */

import React from "react";
import type { Chapter } from "@ai-novel/shared";

// ── Props ─────────────────────────────────────────────────

interface TensionCurveBeatContextStripProps {
  chapter: Chapter | null;
  beatInfo?: {
    type: string;
    label: string;
    description?: string;
  } | null;
}

// ── 组件 ──────────────────────────────────────────────────

export default function TensionCurveBeatContextStrip({
  chapter,
  beatInfo,
}: TensionCurveBeatContextStripProps) {
  if (!chapter) {
    return (
      <div
        style={{
          padding: "8px 12px",
          fontSize: 12,
          color: "#9ca3af",
          background: "#f9fafb",
          borderTop: "1px solid #e5e7eb",
        }}
      >
        悬停章节节点以查看节拍信息
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "8px 12px",
        fontSize: 12,
        background: "#f9fafb",
        borderTop: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontWeight: 600, color: "#374151" }}>
        Ch.{chapter.order}: {chapter.title || "未命名"}
      </span>

      {beatInfo ? (
        <>
          <span style={{ color: "#d1d5db" }}>|</span>
          <span
            style={{
              fontSize: 11,
              padding: "1px 6px",
              borderRadius: 3,
              background: "#eef2ff",
              color: "#4338ca",
              fontWeight: 500,
            }}
          >
            {beatInfo.label || beatInfo.type}
          </span>
          {beatInfo.description && (
            <span style={{ color: "#6b7280", fontStyle: "italic" }}>
              {beatInfo.description}
            </span>
          )}
        </>
      ) : (
        <>
          <span style={{ color: "#d1d5db" }}>|</span>
          <span style={{ color: "#9ca3af" }}>无关联节拍</span>
        </>
      )}

      <span style={{ flex: 1 }} />

      <span style={{ color: "#6366f1", fontWeight: 600 }}>
        冲突: {chapter.conflictLevel ?? 50}
      </span>
      <span style={{ color: "#3b82f6" }}>
        揭示: {chapter.revealLevel ?? 50}
      </span>
    </div>
  );
}
