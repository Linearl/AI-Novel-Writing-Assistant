/**
 * tensionCurveTypes.ts — 冲突曲线类型定义
 *
 * 定义冲突曲线可视化所需的所有 TypeScript 类型，
 * 包括曲线数据点、节奏问题检测结果、组件 Props 等。
 */

import type { Chapter } from "@ai-novel/shared";

// ── 曲线数据 ──────────────────────────────────────────────

/** 单个章节在曲线上的坐标点 */
export interface CurvePoint {
  /** X 坐标（像素） */
  x: number;
  /** Y 坐标（像素，0=顶部/高强度, height=底部/低强度） */
  y: number;
  /** 关联的章节数据 */
  chapter: Chapter;
}

/** 曲线边界约束 */
export interface CurveBounds {
  width: number;
  height: number;
}

// ── React Flow 节点 ───────────────────────────────────────

/** 自定义渲染节点的数据载荷 */
export interface TensionNodeData {
  chapter: Chapter;
  value: number;
  label: string;
  /** 当前节点是否被选中 */
  selected?: boolean;
  /** 该章节是否已有正文 */
  isWritten: boolean;
}

/** 曲线上两点之间的边 */
export interface CurveEdgeData {
  sourceValue: number;
  targetValue: number;
  color: string;
}

// ── 节奏问题检测 ──────────────────────────────────────────

/** 节奏问题码 */
export type TensionIssueCode =
  | "flatPlateau"
  | "lateClimax"
  | "earlyPeak"
  | "noTension"
  | "excessiveTension";

/** 严重程度 */
export type TensionIssueSeverity = "warning" | "critical";

/** 单个节奏问题 */
export interface TensionIssue {
  /** 问题类型码 */
  code: TensionIssueCode;
  /** 严重程度 */
  severity: TensionIssueSeverity;
  /** 受影响的章节 ID 列表 */
  affectedChapters: string[];
  /** 问题描述 */
  description: string;
  /** 修复建议 */
  suggestion: string;
}

/** 问题码对应中文标签 */
export const TENSION_ISSUE_LABELS: Record<TensionIssueCode, string> = {
  flatPlateau: "平坦高原",
  lateClimax: "高潮过迟",
  earlyPeak: "高潮过早",
  noTension: "无冲突",
  excessiveTension: "冲突过度",
};

/** 严重程度对应颜色 */
export const TENSION_SEVERITY_COLORS: Record<TensionIssueSeverity, string> = {
  warning: "#f59e0b",
  critical: "#ef4444",
};

// ── 冲突等级颜色映射 ──────────────────────────────────────

/**
 * 根据冲突值（0-100）返回对应的可视化颜色
 * 低冲突 = 冷色（蓝），中冲突 = 暖色（橙），高冲突 = 热色（红）
 */
export function getConflictColor(value: number): string {
  if (value <= 20) return "#3b82f6";   // blue-500
  if (value <= 40) return "#06b6d4";   // cyan-500
  if (value <= 60) return "#10b981";   // emerald-500
  if (value <= 75) return "#f59e0b";   // amber-500
  if (value <= 90) return "#f97316";   // orange-500
  return "#ef4444";                     // red-500
}

// ── Dashboard/统计类型 ─────────────────────────────────────

/** 全书的冲突曲线统计摘要 */
export interface TensionCurveSummary {
  novelId: string;
  /** 章节总数 */
  chapterCount: number;
  /** 平均冲突值 */
  avgConflictLevel: number;
  /** 最高冲突值 */
  maxConflictLevel: number;
  /** 最低冲突值 */
  minConflictLevel: number;
  /** 标准差 */
  standardDeviation: number;
  /** 检测到的问题数量 */
  issueCount: number;
}
