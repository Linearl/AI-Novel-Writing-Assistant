/**
 * TensionCurveNodes.tsx — 自定义可拖拽 React Flow 节点
 *
 * 每个节点代表一个章节，支持：
 * - 上下拖拽调整冲突值（0-100）
 * - 显示章节标题和冲突值
 * - 视觉反馈（选中/悬停状态）
 * - 颜色按冲突强度变化
 */

import React, { memo, useCallback, useRef, useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import type { TensionNodeData } from "./tensionCurveTypes";
import { clampConflictValue, computeConflictFromDrag, NODE_Y_MAX } from "./curveCoordinates";

// ── 样式常量 ──────────────────────────────────────────────

const NODE_WIDTH = 80;
const NODE_HEIGHT = 56;

// ── 组件 ──────────────────────────────────────────────────

const TensionCurveNode = memo(function TensionCurveNode({
  data,
  selected,
}: NodeProps & { data: TensionNodeData }) {
  const { chapter, value, isWritten } = data;
  const [dragValue, setDragValue] = useState<number | null>(null);
  const dragStartY = useRef<number>(0);
  const dragStartValue = useRef<number>(value);
  const isDragging = useRef(false);

  const displayValue = dragValue ?? value;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      dragStartY.current = e.clientY;
      dragStartValue.current = value;
      isDragging.current = false;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        isDragging.current = true;
        const deltaY = dragStartY.current - moveEvent.clientY;
        const newValue = clampConflictValue(
          dragStartValue.current + deltaY / (NODE_Y_MAX / 100),
        );
        setDragValue(newValue);
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        if (isDragging.current && dragValue !== null) {
          const finalDeltaY = dragStartY.current - upEvent.clientY;
          const finalValue = computeConflictFromDrag(dragStartValue.current, -finalDeltaY);
          setDragValue(null);
          // 通过 node 的 data.onChange 回调保存
          if (typeof (data as any).onChange === "function") {
            (data as any).onChange(chapter.id, finalValue);
          }
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [value, chapter.id, dragValue, data],
  );

  // 冲突值颜色
  const color = getNodeColor(displayValue);

  return (
    <div
      className="tension-curve-node"
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        borderRadius: 8,
        border: selected ? `2px solid ${color}` : `1px solid ${color}40`,
        background: selected ? `${color}20` : "#fff",
        cursor: "ns-resize",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        lineHeight: 1.3,
        boxShadow: selected ? `0 0 8px ${color}40` : "0 1px 3px rgba(0,0,0,0.08)",
        userSelect: "none",
        transition: "box-shadow 0.15s ease",
        opacity: isWritten ? 1 : 0.7,
      }}
      onMouseDown={handleMouseDown}
      title={`Ch.${chapter.order}: ${chapter.title || "未命名"}\n冲突值: ${displayValue}\n拖拽上下调整`}
    >
      <Handle type="target" position={Position.Left} style={{ visibility: "hidden" }} />
      <Handle type="source" position={Position.Right} style={{ visibility: "hidden" }} />

      {/* 冲突值指示条 */}
      <div
        style={{
          width: "100%",
          height: 3,
          borderRadius: "1.5px 1.5px 0 0",
          background: color,
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />

      <span
        style={{
          fontWeight: 600,
          fontSize: 10,
          color: "#374151",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: NODE_WIDTH - 8,
        }}
      >
        Ch.{chapter.order}
      </span>
      <span
        style={{
          fontWeight: 700,
          fontSize: 13,
          color,
        }}
      >
        {displayValue}
      </span>

      {!isWritten && (
        <span
          style={{
            fontSize: 8,
            color: "#9ca3af",
            marginTop: 1,
          }}
        >
          草稿
        </span>
      )}
    </div>
  );
});

// ── 工具函数 ──────────────────────────────────────────────

function getNodeColor(value: number): string {
  if (value <= 20) return "#3b82f6";
  if (value <= 40) return "#06b6d4";
  if (value <= 60) return "#10b981";
  if (value <= 75) return "#f59e0b";
  if (value <= 90) return "#f97316";
  return "#ef4444";
}

export default TensionCurveNode;
