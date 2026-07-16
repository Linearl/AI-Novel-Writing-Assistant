/**
 * curveCoordinates.ts — 曲线坐标计算工具
 *
 * 提供章节数据到 SVG/React Flow 坐标系的映射函数，
 * 以及基于 d3-shape 的平滑曲线路径生成。
 */

import {
  line,
  curveMonotoneX,
} from "d3-shape";
import type { Chapter } from "@ai-novel/shared";
import type { CurveBounds, CurvePoint } from "./tensionCurveTypes.ts";

// ── 核心坐标计算 ──────────────────────────────────────────

/**
 * 简单的线性缩放函数（替代 d3.scaleLinear）
 */
function createLinearScale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const ratio = (r1 - r0) / (d1 - d0 || 1);
  return (value: number) => r0 + ratio * (value - d0);
}

/**
 * 将章节数组映射为曲线坐标点
 * X 轴 = 章节索引（线性映射到画布宽度）
 * Y 轴 = 冲突值 0-100（线性映射到画布高度，反转：0=底部, 100=顶部）
 */
export function computeCurveCoordinates(
  chapters: Chapter[],
  bounds: CurveBounds,
): CurvePoint[] {
  if (chapters.length === 0) return [];

  const xScale = createLinearScale(
    [0, Math.max(1, chapters.length - 1)],
    [COORDINATE_PADDING, bounds.width - COORDINATE_PADDING],
  );

  const yScale = createLinearScale(
    [0, 100],
    [bounds.height - COORDINATE_PADDING, COORDINATE_PADDING],
  );

  return chapters.map((chapter, index) => ({
    x: xScale(index),
    y: yScale(chapter.conflictLevel ?? 50),
    chapter,
  }));
}

/** 画布边距 */
export const COORDINATE_PADDING = 40;

// ── 曲线路径生成 ──────────────────────────────────────────

/**
 * 使用 d3-shape 的 monotoneX 插值生成平滑 SVG path 字符串
 */
export function generateCurvePath(points: CurvePoint[]): string {
  if (points.length === 0) return "";

  const lineGenerator = line<CurvePoint>()
    .x((d: CurvePoint) => d.x)
    .y((d: CurvePoint) => d.y)
    .curve(curveMonotoneX);

  return lineGenerator(points) ?? "";
}

// ── 坐标数据提取 ──────────────────────────────────────────

/**
 * 从章节数组中提取纯冲突值数组
 */
export function extractConflictValues(chapters: Chapter[]): number[] {
  return chapters.map((ch) => ch.conflictLevel ?? 50);
}

/**
 * 从章节数组中提取纯揭示值数组
 */
export function extractRevealValues(chapters: Chapter[]): number[] {
  return chapters.map((ch) => ch.revealLevel ?? 50);
}

// ── React Flow 节点定位 ───────────────────────────────────

/** 节点之间的水平间距 */
export const NODE_SPACING_X = 120;

/** 节点垂直移动范围（从画布顶部到画布底部） */
export const NODE_Y_MIN = 0;
export const NODE_Y_MAX = 400;

/**
 * 根据章节索引和冲突值计算 React Flow 节点的像素坐标
 */
export function computeNodePosition(
  index: number,
  conflictLevel: number,
  totalChapters: number,
  canvasWidth: number,
): { x: number; y: number } {
  const usableWidth = canvasWidth - COORDINATE_PADDING * 2;
  const spacing = totalChapters > 1
    ? usableWidth / (totalChapters - 1)
    : 0;

  const x = COORDINATE_PADDING + spacing * index;

  // Y 轴反转：conflictLevel=100 → y=0（顶部），conflictLevel=0 → y=NODE_Y_MAX（底部）
  const y = NODE_Y_MAX - (conflictLevel / 100) * NODE_Y_MAX;

  return { x, y };
}

// ── 冲突值边界约束 ─────────────────────────────────────────

/**
 * 将冲突值限制在 0-100 范围内并取整
 */
export function clampConflictValue(raw: number): number {
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * 根据拖拽的像素增量计算新的冲突值
 */
export function computeConflictFromDrag(
  currentValue: number,
  deltaY: number,
): number {
  // deltaY > 0 表示向下拖拽 → 冲突值减小
  // NODE_Y_MAX 像素对应 0-100 范围
  const pixelPerUnit = NODE_Y_MAX / 100;
  const newValue = currentValue - deltaY / pixelPerUnit;
  return clampConflictValue(newValue);
}
