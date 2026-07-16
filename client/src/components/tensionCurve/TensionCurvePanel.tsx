/**
 * TensionCurvePanel.tsx — 冲突曲线主面板
 *
 * 整合所有子组件的容器组件，作为冲突曲线功能的顶层入口。
 * 包含：
 * - 卷上下文栏
 * - React Flow 画布
 * - 节拍上下文条
 * - 章节详情侧边栏
 */

import React, { useCallback, useMemo, useState } from "react";
import type { Chapter } from "@ai-novel/shared";
import TensionCurveFlowCanvas from "./TensionCurveFlowCanvas";
import TensionCurveVolumeContextBar from "./TensionCurveVolumeContextBar";
import TensionCurveBeatContextStrip from "./TensionCurveBeatContextStrip";
import TensionCurveChapterDetailSidebar from "./TensionCurveChapterDetailSidebar";
import { analyzeTensionCurve, computeTensionStats } from "./tensionCurveAnalysis";
import type { TensionIssue, TensionCurveSummary } from "./tensionCurveTypes";

// ── Props ─────────────────────────────────────────────────

interface TensionCurvePanelProps {
  novelId: string;
  chapters: Chapter[];
  volumes?: Array<{
    id: string;
    title: string;
    sortOrder: number;
    chapterCount: number;
  }>;
  /** 冲突值变更回调（保存到后端） */
  onValueChange?: (chapterId: string, newValue: number) => Promise<void>;
  /** 批量冲突值变更回调 */
  onVolumeValueChange?: (volumeId: string, newValue: number) => Promise<void>;
  /** 节奏问题统计变更回调 */
  onIssuesChange?: (issues: TensionIssue[]) => void;
  /** 是否只读模式 */
  readOnly?: boolean;
  /** 是否全屏 */
  fullscreen?: boolean;
  /** 切换全屏回调 */
  onToggleFullscreen?: () => void;
}

// ── 组件 ──────────────────────────────────────────────────

export default function TensionCurvePanel({
  novelId,
  chapters,
  volumes = [],
  onValueChange,
  onVolumeValueChange,
  onIssuesChange,
  readOnly = false,
  fullscreen = false,
  onToggleFullscreen,
}: TensionCurvePanelProps) {
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [activeVolumeId, setActiveVolumeId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  // 排序章节
  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.order - b.order),
    [chapters],
  );

  // 节奏分析
  const issues = useMemo(() => analyzeTensionCurve(sortedChapters), [sortedChapters]);
  const stats = useMemo(() => computeTensionStats(sortedChapters), [sortedChapters]);

  // 整理卷信息
  const volumeContexts = useMemo(() => {
    if (volumes.length > 0) return volumes;

    // 如果没有显式传入卷数据，尝试从章节中按 order 推算
    if (sortedChapters.length === 0) return [];

    return [
      {
        id: "default",
        title: "全书",
        sortOrder: 0,
        chapterCount: sortedChapters.length,
        avgConflictLevel: stats.avg,
        avgRevealLevel: 0,
      },
    ];
  }, [volumes, sortedChapters, stats]);

  // 增强卷信息添加统计
  const enhancedVolumes = useMemo(
    () =>
      volumeContexts.map((vol) => {
        const volChapters = sortedChapters.slice(0, vol.chapterCount); // 简化：基于顺序计算
        const volStats = computeTensionStats(volChapters);
        return {
          ...vol,
          avgConflictLevel: volStats.avg,
          avgRevealLevel: 0,
        };
      }),
    [volumeContexts, sortedChapters],
  );

  // 节点点击
  const handleNodeClick = useCallback(
    (chapter: Chapter) => {
      setSelectedChapter(chapter);
      setShowSidebar(true);
    },
    [],
  );

  // 保存冲突值
  const handleValueChange = useCallback(
    async (chapterId: string, newValue: number) => {
      await onValueChange?.(chapterId, newValue);
    },
    [onValueChange],
  );

  // 侧边栏关闭
  const handleSidebarClose = useCallback(() => {
    setShowSidebar(false);
    setSelectedChapter(null);
  }, []);

  // 统计摘要
  const summary: TensionCurveSummary = useMemo(
    () => ({
      novelId,
      chapterCount: sortedChapters.length,
      avgConflictLevel: stats.avg,
      maxConflictLevel: stats.max,
      minConflictLevel: stats.min,
      standardDeviation: stats.stdDev,
      issueCount: issues.length,
    }),
    [novelId, sortedChapters.length, stats, issues.length],
  );

  return (
    <div
      className="tension-curve-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: fullscreen ? "100vh" : "100%",
        background: "#fff",
        borderRadius: fullscreen ? 0 : 8,
        border: fullscreen ? "none" : "1px solid #e5e7eb",
        overflow: "hidden",
      }}
    >
      {/* 头部：标题 + 全屏按钮 */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#fafafa",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
            冲突曲线
          </h3>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9ca3af" }}>
            {summary.chapterCount} 章 | 平均冲突 {summary.avgConflictLevel} |{" "}
            {issues.length > 0
              ? `${issues.length} 个节奏问题`
              : "节奏良好"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              style={{
                fontSize: 18,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#6b7280",
                padding: "4px 6px",
                borderRadius: 4,
              }}
              title={fullscreen ? "退出全屏" : "全屏"}
            >
              {fullscreen ? "⊠" : "⊞"}
            </button>
          )}
        </div>
      </div>

      {/* 卷上下文栏 */}
      <TensionCurveVolumeContextBar
        volumes={enhancedVolumes}
        activeVolumeId={activeVolumeId}
        onVolumeChange={setActiveVolumeId}
      />

      {/* 画布 */}
      <div style={{ flex: 1, minHeight: 300 }}>
        <TensionCurveFlowCanvas
          chapters={sortedChapters}
          volumes={enhancedVolumes}
          onValueChange={readOnly ? undefined : handleValueChange}
          onNodeClick={handleNodeClick}
          readOnly={readOnly}
          externalIssues={issues}
        />
      </div>

      {/* 节拍上下文条 */}
      <TensionCurveBeatContextStrip chapter={selectedChapter} beatInfo={null} />

      {/* 侧边栏 */}
      <TensionCurveChapterDetailSidebar
        chapter={selectedChapter}
        visible={showSidebar}
        onClose={handleSidebarClose}
        onValueSave={handleValueChange}
      />
    </div>
  );
}
