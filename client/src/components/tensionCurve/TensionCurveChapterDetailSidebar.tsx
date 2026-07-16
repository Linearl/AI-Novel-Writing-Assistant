/**
 * TensionCurveChapterDetailSidebar.tsx — 章节详情侧边栏
 *
 * 点击曲线节点后从右侧滑入，显示：
 * - 章节基本信息（标题、序号、状态）
 * - 冲突/揭示值精确编辑
 * - 章节摘要
 * - 关联的节拍信息
 */

import React from "react";
import type { Chapter } from "@ai-novel/shared";
import TensionCurveEditDialog from "./TensionCurveEditDialog";

// ── Props ─────────────────────────────────────────────────

interface TensionCurveChapterDetailSidebarProps {
  chapter: Chapter | null;
  visible: boolean;
  onClose: () => void;
  onValueSave: (chapterId: string, newValue: number) => void;
}

// ── 组件 ──────────────────────────────────────────────────

export default function TensionCurveChapterDetailSidebar({
  chapter,
  visible,
  onClose,
  onValueSave,
}: TensionCurveChapterDetailSidebarProps) {
  const [showEditDialog, setShowEditDialog] = React.useState(false);

  if (!chapter || !visible) return null;

  const conflictValue = chapter.conflictLevel ?? 50;
  const revealValue = chapter.revealLevel ?? 50;

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 320,
          background: "#fff",
          borderLeft: "1px solid #e5e7eb",
          zIndex: 1000,
          boxShadow: "-4px 0 20px rgba(0,0,0,0.06)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* 头部 */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
              Ch.{chapter.order}
            </h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#6b7280" }}>
              {chapter.title || "未命名章节"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              color: "#9ca3af",
              padding: "4px 8px",
              borderRadius: 4,
            }}
            aria-label="关闭侧边栏"
          >
            ×
          </button>
        </div>

        {/* 内容 */}
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {/* 状态 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase" }}>
              状态
            </label>
            <div style={{ marginTop: 4 }}>
              <span
                style={{
                  fontSize: 12,
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: chapter.content ? "#dcfce7" : "#fef3c7",
                  color: chapter.content ? "#166534" : "#92400e",
                }}
              >
                {chapter.content ? "已写" : "草稿"}
              </span>
            </div>
          </div>

          {/* 冲突值 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase" }}>
                冲突强度
              </label>
              <button
                type="button"
                onClick={() => setShowEditDialog(true)}
                style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 4,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  color: "#6366f1",
                  cursor: "pointer",
                }}
              >
                编辑
              </button>
            </div>
            <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  background: "#f3f4f6",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${conflictValue}%`,
                    height: "100%",
                    borderRadius: 3,
                    background: getConflictColor(conflictValue),
                    transition: "width 0.2s ease",
                  }}
                />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: getConflictColor(conflictValue) }}>
                {conflictValue}
              </span>
            </div>
          </div>

          {/* 揭示值 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase" }}>
              揭示强度
            </label>
            <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  background: "#f3f4f6",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${revealValue}%`,
                    height: "100%",
                    borderRadius: 3,
                    background: "#3b82f6",
                    transition: "width 0.2s ease",
                  }}
                />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#3b82f6" }}>
                {revealValue}
              </span>
            </div>
          </div>

          {/* 摘要 */}
          {chapter.expectation && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase" }}>
                摘要
              </label>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 12,
                  color: "#374151",
                  lineHeight: 1.5,
                }}
              >
                {chapter.expectation}
              </p>
            </div>
          )}

          {/* 目标字数 */}
          {typeof chapter.targetWordCount === "number" && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase" }}>
                目标字数
              </label>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#374151" }}>
                {chapter.targetWordCount.toLocaleString()} 字
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 编辑对话框 */}
      {showEditDialog && (
        <TensionCurveEditDialog
          chapter={chapter}
          currentValue={conflictValue}
          onSave={(chapterId, newValue) => {
            onValueSave(chapterId, newValue);
            setShowEditDialog(false);
          }}
          onClose={() => setShowEditDialog(false)}
        />
      )}
    </>
  );
}

// ── 工具 ──────────────────────────────────────────────────

function getConflictColor(value: number): string {
  if (value <= 20) return "#3b82f6";
  if (value <= 40) return "#06b6d4";
  if (value <= 60) return "#10b981";
  if (value <= 75) return "#f59e0b";
  if (value <= 90) return "#f97316";
  return "#ef4444";
}
