/**
 * TensionCurveFlowCanvas.tsx — React Flow 冲突曲线画布
 *
 * 核心可视化组件，使用 React Flow 渲染交互式冲突曲线。
 * 功能：
 * - SVG 平滑曲线（d3-shape monotoneX）
 * - 可拖拽章节节点
 * - 缩放和平移
 * - 卷分隔线
 * - 节奏问题高亮区域
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Chapter } from "@ai-novel/shared";
import TensionCurveNode from "./TensionCurveNodes";
import {
  computeCurveCoordinates,
  generateCurvePath,
  COORDINATE_PADDING,
  computeNodePosition,
} from "./curveCoordinates";
import { analyzeTensionCurve } from "./tensionCurveAnalysis";
import type { TensionIssue, TensionNodeData } from "./tensionCurveTypes";

// ── 节点类型注册 ──────────────────────────────────────────

const nodeTypes: NodeTypes = {
  tensionNode: TensionCurveNode,
};

// ── 常量 ──────────────────────────────────────────────────

const DEFAULT_CANVAS_WIDTH = 1200;
const DEFAULT_CANVAS_HEIGHT = 460;

// ── Props ─────────────────────────────────────────────────

interface TensionCurveFlowCanvasProps {
  chapters: Chapter[];
  volumes?: Array<{
    id: string;
    title: string;
    sortOrder: number;
    chapterCount: number;
  }>;
  /** 节点值变更回调 */
  onValueChange?: (chapterId: string, newValue: number) => void;
  /** 节点点击回调 */
  onNodeClick?: (chapter: Chapter) => void;
  /** 节奏问题列表（由外部注入，或内部自动计算） */
  externalIssues?: TensionIssue[];
  /** 是否只读 */
  readOnly?: boolean;
}

// ── 组件 ──────────────────────────────────────────────────

export default function TensionCurveFlowCanvas({
  chapters,
  volumes = [],
  onValueChange,
  onNodeClick,
  externalIssues,
  readOnly = false,
}: TensionCurveFlowCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);

  // 自动计算问题（如果没有外部传入）
  const issues = useMemo(
    () => externalIssues ?? analyzeTensionCurve(chapters),
    [chapters, externalIssues],
  );

  // 排序后的章节
  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.order - b.order),
    [chapters],
  );

  // 计算坐标
  const curvePoints = useMemo(
    () =>
      computeCurveCoordinates(sortedChapters, {
        width: DEFAULT_CANVAS_WIDTH,
        height: DEFAULT_CANVAS_HEIGHT,
      }),
    [sortedChapters],
  );

  // 曲线路径
  const curvePath = useMemo(
    () => generateCurvePath(curvePoints),
    [curvePoints],
  );

  // 节点
  const initialNodes = useMemo(
    () =>
      sortedChapters.map((chapter, index) => {
        const pos = computeNodePosition(
          index,
          chapter.conflictLevel ?? 50,
          sortedChapters.length,
          DEFAULT_CANVAS_WIDTH,
        );
        return {
          id: chapter.id,
          type: "tensionNode",
          position: pos,
          data: {
            chapter,
            value: chapter.conflictLevel ?? 50,
            label: chapter.title || `Ch.${chapter.order}`,
            isWritten: Boolean(chapter.content),
            onChange: onValueChange,
          } satisfies TensionNodeData & { onChange?: typeof onValueChange },
        };
      }),
    [sortedChapters, onValueChange],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState<Edge>([]);

  // 同步外部 chapter 数据到节点
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  // 构建节点之间的平滑曲线边
  useEffect(() => {
    const newEdges: Edge[] = [];
    for (let i = 0; i < sortedChapters.length - 1; i++) {
      const source = sortedChapters[i];
      const target = sortedChapters[i + 1];
      newEdges.push({
        id: `e-${source.id}-${target.id}`,
        source: source.id,
        target: target.id,
        type: "smoothstep",
        animated: false,
        style: {
          stroke: "#d1d5db",
          strokeWidth: 1.5,
        },
      });
    }
    setEdges(newEdges);
  }, [sortedChapters, setEdges]);

  // 节点点击
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const chapter = (node.data as unknown as TensionNodeData).chapter;
      onNodeClick?.(chapter);
    },
    [onNodeClick],
  );

  // 受影响的章节 ID 集合
  const affectedChapterIds = useMemo(() => {
    const ids = new Set<string>();
    for (const issue of issues) {
      for (const chId of issue.affectedChapters) {
        ids.add(chId);
      }
    }
    return ids;
  }, [issues]);

  // 卷边界线
  const volumeBoundaries = useMemo(() => {
    if (volumes.length <= 1) return [];
    const boundaries: Array<{ x: number; title: string }> = [];
    let cumulative = 0;
    for (let i = 0; i < volumes.length; i++) {
      cumulative += volumes[i].chapterCount;
      if (i < volumes.length - 1 && cumulative < sortedChapters.length) {
        const pos = computeNodePosition(
          cumulative - 0.5,
          50,
          sortedChapters.length,
          DEFAULT_CANVAS_WIDTH,
        );
        boundaries.push({ x: pos.x, title: volumes[i + 1].title });
      }
    }
    return boundaries;
  }, [volumes, sortedChapters.length]);

  return (
    <div
      ref={canvasRef}
      className="tension-curve-flow-canvas"
      style={{ width: "100%", height: DEFAULT_CANVAS_HEIGHT, position: "relative" }}
    >
      {/* SVG 背景层：曲线和问题标注 */}
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        {curvePath && (
          <path
            d={curvePath}
            fill="none"
            stroke="#6366f1"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.7}
          />
        )}
      </svg>

      {/* React Flow 画布层 */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readOnly ? undefined : onNodesChange}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        nodesDraggable={!readOnly}
        nodesConnectable={false}
        elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
        style={{ background: "transparent" }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
        <Controls showInteractive={!readOnly} />
        <MiniMap
          nodeColor={(node) => {
            const value = (node.data as unknown as TensionNodeData)?.value ?? 50;
            if (value >= 75) return "#f97316";
            if (value <= 30) return "#06b6d4";
            return "#6366f1";
          }}
          style={{ background: "#f9fafb" }}
        />
      </ReactFlow>

      {/* 问题列表面板（底部） */}
      {issues.length > 0 && (
        <div
          className="tension-issues-panel"
          style={{
            position: "absolute",
            bottom: 4,
            left: 8,
            right: 8,
            zIndex: 10,
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
            pointerEvents: "auto",
          }}
        >
          {issues.slice(0, 4).map((issue, idx) => (
            <span
              key={`${issue.code}-${idx}`}
              title={issue.description + "\n" + issue.suggestion}
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderRadius: 4,
                background: issue.severity === "critical" ? "#fef2f2" : "#fffbeb",
                color: issue.severity === "critical" ? "#dc2626" : "#d97706",
                border: `1px solid ${issue.severity === "critical" ? "#fecaca" : "#fde68a"}`,
                cursor: "help",
                whiteSpace: "nowrap",
              }}
            >
              {issue.severity === "critical" && "!! "}
              {issue.description.length > 30
                ? issue.description.slice(0, 28) + "..."
                : issue.description}
            </span>
          ))}
          {issues.length > 4 && (
            <span
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderRadius: 4,
                background: "#f3f4f6",
                color: "#6b7280",
                border: "1px solid #e5e7eb",
              }}
            >
              +{issues.length - 4} 个问题
            </span>
          )}
        </div>
      )}
    </div>
  );
}
