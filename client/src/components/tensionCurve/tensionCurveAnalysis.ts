/**
 * tensionCurveAnalysis.ts — 节奏问题自动检测
 *
 * 分析全书冲突曲线，检测 5 种节奏问题：
 * - flatPlateau: 平坦高原
 * - lateClimax: 高潮过迟
 * - earlyPeak: 高潮过早
 * - noTension: 无冲突
 * - excessiveTension: 冲突过度
 */

import type { Chapter } from "@ai-novel/shared";
import type { TensionIssue, TensionIssueCode } from "./tensionCurveTypes.ts";
import { extractConflictValues } from "./curveCoordinates.ts";

// ── 检测阈值常量 ──────────────────────────────────────────

/** 平坦高原：连续 N+ 章波动小于此阈值 */
const FLAT_THRESHOLD = 6;
/** 平坦高原：波动差 < 此值为平坦 */
const FLAT_VARIANCE_MAX = 10;

/** 高潮过迟：最高峰出现在最后 N% */
const LATE_CLIMAX_RATIO = 0.2;

/** 高潮过早：前 N% 出现全书最高峰 */
const EARLY_PEAK_RATIO = 0.3;

/** 无冲突：冲突值 < 此值 */
const NO_TENSION_THRESHOLD = 20;
/** 无冲突：连续 N+ 章 */
const NO_TENSION_SPAN = 3;

/** 冲突过度：冲突值 > 此值 */
const EXCESSIVE_THRESHOLD = 90;
/** 冲突过度：连续 N+ 章 */
const EXCESSIVE_SPAN = 5;

// ── 入口函数 ──────────────────────────────────────────────

/**
 * 分析冲突曲线，返回所有检测到的节奏问题
 */
export function analyzeTensionCurve(chapters: Chapter[]): TensionIssue[] {
  const issues: TensionIssue[] = [];
  const values = extractConflictValues(chapters);

  if (chapters.length === 0) return issues;

  issues.push(...detectFlatPlateau(chapters, values));
  issues.push(...detectLateClimax(chapters, values));
  issues.push(...detectEarlyPeak(chapters, values));
  issues.push(...detectNoTension(chapters, values));
  issues.push(...detectExcessiveTension(chapters, values));

  return issues;
}

/**
 * 按严重程度排序问题列表（critical 在前）
 */
export function sortIssuesBySeverity(issues: TensionIssue[]): TensionIssue[] {
  const severityRank: Record<string, number> = {
    critical: 0,
    warning: 1,
  };
  return [...issues].sort(
    (a, b) => severityRank[a.severity] - severityRank[b.severity],
  );
}

/**
 * 获取问题类型对应的严重程度
 */
export function getIssueSeverity(code: TensionIssueCode): "warning" | "critical" {
  switch (code) {
    case "noTension":
    case "excessiveTension":
      return "critical";
    case "flatPlateau":
    case "lateClimax":
    case "earlyPeak":
      return "warning";
  }
}

// ── 单一问题检测函数 ──────────────────────────────────────

/**
 * 检测平坦高原：连续 N 章冲突值波动不足
 */
function detectFlatPlateau(
  chapters: Chapter[],
  values: number[],
): TensionIssue[] {
  const issues: TensionIssue[] = [];
  let runStart = 0;
  let runMin = values[0];
  let runMax = values[0];

  for (let i = 1; i <= values.length; i++) {
    if (i < values.length) {
      runMin = Math.min(runMin, values[i]);
      runMax = Math.max(runMax, values[i]);
    }

    const isEndOfRun =
      i === values.length ||
      Math.abs(values[i] - values[i - 1]) > FLAT_VARIANCE_MAX;

    if (isEndOfRun) {
      const span = i - runStart;
      if (span >= FLAT_THRESHOLD) {
        issues.push({
          code: "flatPlateau",
          severity: getIssueSeverity("flatPlateau"),
          affectedChapters: chapters
            .slice(runStart, i)
            .map((ch) => ch.id),
          description: `第 ${runStart + 1}-${i} 章冲突值波动不足 (范围 ${runMin}-${runMax})，节奏过于平坦。`,
          suggestion:
            "考虑在该区间增加冲突事件、悬念或转折来提升张弛变化。",
        });
      }
      runStart = i;
      if (i < values.length) {
        runMin = values[i];
        runMax = values[i];
      }
    }
  }

  return issues;
}

/**
 * 检测高潮过迟：书末 20% 才出现全书最高峰
 */
function detectLateClimax(
  chapters: Chapter[],
  values: number[],
): TensionIssue[] {
  if (chapters.length < 3) return [];

  const maxValue = Math.max(...values);
  if (maxValue < 60) return []; // 最高峰不够高，不算

  // 找到最高峰最后一次出现的位置
  let lastPeakIndex = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] === maxValue) {
      lastPeakIndex = i;
      break;
    }
  }

  const thresholdIndex = Math.ceil(
    chapters.length * (1 - LATE_CLIMAX_RATIO),
  );

  if (lastPeakIndex >= thresholdIndex) {
    return [
      {
        code: "lateClimax",
        severity: getIssueSeverity("lateClimax"),
        affectedChapters: chapters
          .slice(lastPeakIndex, lastPeakIndex + 1)
          .map((ch) => ch.id),
        description: `全书最高冲突峰出现在第 ${lastPeakIndex + 1} 章（书末 ${Math.round(((chapters.length - lastPeakIndex) / chapters.length) * 100)}%），高潮过迟可能导致读者失去耐心。`,
        suggestion: "考虑在前中段设置次高峰，将最高潮适度前移。",
      },
    ];
  }

  return [];
}

/**
 * 检测高潮过早：前 30% 出现全书最高峰
 */
function detectEarlyPeak(
  chapters: Chapter[],
  values: number[],
): TensionIssue[] {
  if (chapters.length < 5) return [];

  const maxValue = Math.max(...values);
  if (maxValue < 60) return [];

  let peakIndex = values.indexOf(maxValue);

  const thresholdIndex = Math.floor(
    chapters.length * EARLY_PEAK_RATIO,
  );

  // 检查后面是否还有足够高的峰值（>= 80% of max）
  const laterMax = Math.max(
    ...values.slice(Math.floor(chapters.length * 0.5)),
  );

  if (peakIndex <= thresholdIndex && laterMax < maxValue * 0.85) {
    return [
      {
        code: "earlyPeak",
        severity: getIssueSeverity("earlyPeak"),
        affectedChapters: chapters
          .slice(peakIndex, peakIndex + 1)
          .map((ch) => ch.id),
        description: `全书最高冲突峰出现在第 ${peakIndex + 1} 章（前 ${Math.round(((peakIndex + 1) / chapters.length) * 100)}%），高潮过早会导致后半本书缺乏驱动力。`,
        suggestion: "降低早期峰值或提升中后期冲突强度，确保全书持续攀升。",
      },
    ];
  }

  return [];
}

/**
 * 检测无冲突：连续 N 章冲突值过低
 */
function detectNoTension(
  chapters: Chapter[],
  values: number[],
): TensionIssue[] {
  const issues: TensionIssue[] = [];
  let runStart = -1;

  for (let i = 0; i <= values.length; i++) {
    if (i < values.length && values[i] < NO_TENSION_THRESHOLD) {
      if (runStart === -1) runStart = i;
    } else {
      if (runStart !== -1) {
        const span = i - runStart;
        if (span >= NO_TENSION_SPAN) {
          issues.push({
            code: "noTension",
            severity: getIssueSeverity("noTension"),
            affectedChapters: chapters
              .slice(runStart, i)
              .map((ch) => ch.id),
            description: `第 ${runStart + 1}-${i} 章冲突值持续低于 ${NO_TENSION_THRESHOLD}，缺乏叙事张力。`,
            suggestion: "即使是过渡章节也应保持基本的冲突要素或悬念。",
          });
        }
        runStart = -1;
      }
    }
  }

  return issues;
}

/**
 * 检测冲突过度：连续 N 章冲突值过高
 */
function detectExcessiveTension(
  chapters: Chapter[],
  values: number[],
): TensionIssue[] {
  const issues: TensionIssue[] = [];
  let runStart = -1;

  for (let i = 0; i <= values.length; i++) {
    if (i < values.length && values[i] > EXCESSIVE_THRESHOLD) {
      if (runStart === -1) runStart = i;
    } else {
      if (runStart !== -1) {
        const span = i - runStart;
        if (span >= EXCESSIVE_SPAN) {
          issues.push({
            code: "excessiveTension",
            severity: getIssueSeverity("excessiveTension"),
            affectedChapters: chapters
              .slice(runStart, i)
              .map((ch) => ch.id),
            description: `第 ${runStart + 1}-${i} 章冲突值持续高于 ${EXCESSIVE_THRESHOLD}，连续高强度可能导致读者疲劳。`,
            suggestion: "在高冲突区间后安排 cooling-down 章节让读者喘息。",
          });
        }
        runStart = -1;
      }
    }
  }

  return issues;
}

// ── 统计工具 ──────────────────────────────────────────────

/**
 * 计算冲突值统计摘要
 */
export function computeTensionStats(chapters: Chapter[]): {
  avg: number;
  max: number;
  min: number;
  stdDev: number;
} {
  const values = extractConflictValues(chapters);

  if (values.length === 0) {
    return { avg: 0, max: 0, min: 0, stdDev: 0 };
  }

  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);

  const variance =
    values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return { avg: Math.round(avg), max, min, stdDev: Math.round(stdDev * 10) / 10 };
}
