import { useEffect, useState } from "react";

// ──────────────────── 类型定义 ────────────────────

interface ProgressCurrentChapter {
  index: number;
  title: string | null;
  status: "pending" | "running" | "completed" | "failed" | "needs_repair";
}

interface ProgressBatchInfo {
  batchSize: number;
  currentBatch: number;
  totalBatches: number;
}

interface ProgressInfo {
  targetId: string;
  targetType: "novel" | "job" | "workflow";
  totalChapters: number;
  completedChapters: number;
  progressPercent: number;
  currentChapter: ProgressCurrentChapter;
  estimatedRemainingMinutes: number;
  elapsedMinutes: number;
  failedCount: number;
  draftedCount: number;
  needsRepairCount: number;
  activeChapterOrder: number | null;
  batchInfo: ProgressBatchInfo | null;
  phase: string | null;
}

// ──────────────────── Props ────────────────────

type ProgressTarget =
  | { type: "novel"; novelId: string }
  | { type: "job"; novelId: string; jobId: string }
  | { type: "workflow"; novelId: string; taskId: string };

interface ProgressVisualizationProps {
  target: ProgressTarget;
  refreshInterval?: number;
}

// ──────────────────── 工具函数 ────────────────────

function formatTime(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return "--";
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (hours > 0) {
    return `${hours}小时${mins}分钟`;
  }
  return `${mins}分钟`;
}

function formatElapsed(minutes: number): string {
  return formatTime(minutes);
}

function statusLabel(status: ProgressCurrentChapter["status"]): string {
  switch (status) {
    case "running": return "生成中";
    case "completed": return "已完成";
    case "failed": return "失败";
    case "needs_repair": return "待修复";
    case "pending":
    default:
      return "等待中";
  }
}

function statusColor(status: ProgressCurrentChapter["status"]): string {
  switch (status) {
    case "running": return "#2196f3";
    case "completed": return "#4caf50";
    case "failed": return "#f44336";
    case "needs_repair": return "#ff9800";
    case "pending":
    default:
      return "#9e9e9e";
  }
}

function phaseLabel(phase: string | null): string {
  if (!phase) return "";
  const map: Record<string, string> = {
    queued: "排队中",
    running: "执行中",
    succeeded: "已完成",
    failed: "失败",
    cancelled: "已取消",
  };
  return map[phase] ?? phase;
}

// ──────────────────── 组件 ────────────────────

export function ProgressVisualization({
  target,
  refreshInterval = 2000,
}: ProgressVisualizationProps) {
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchProgress() {
      try {
        const url = buildProgressUrl(target);
        const response = await fetch(url);
        const json = await response.json();

        if (cancelled) return;

        if (json.success) {
          setProgress(json.data as ProgressInfo);
          setError(null);
        } else {
          setError(json.error ?? "获取进度失败");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "网络请求失败");
        }
      }
    }

    fetchProgress();
    const interval = setInterval(fetchProgress, refreshInterval);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [target.novelId, target.type, (target as any).jobId, (target as any).taskId, refreshInterval]);

  if (error && !progress) {
    return (
      <div className="progress-visualization progress-error">
        <p>进度加载失败：{error}</p>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="progress-visualization progress-loading">
        <p>正在加载进度...</p>
      </div>
    );
  }

  const fillPercent = Math.max(0, Math.min(100, progress.progressPercent));
  const fillColor = fillPercent >= 100
    ? "#4caf50"
    : progress.needsRepairCount > 0
      ? "#ff9800"
      : "#2196f3";

  return (
    <div className="progress-visualization">
      {/* ── 阶段与状态 ── */}
      <div className="progress-header">
        <span className="progress-phase">{phaseLabel(progress.phase)}</span>
        {error && <span className="progress-warning">（{error}）</span>}
      </div>

      {/* ── 进度条 ── */}
      <div className="progress-bar-container">
        <div className="progress-bar" role="progressbar" aria-valuenow={fillPercent} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="progress-fill"
            style={{
              width: `${fillPercent}%`,
              backgroundColor: fillColor,
              transition: "width 0.4s ease",
            }}
          />
        </div>
        <span className="progress-text">
          {progress.completedChapters} / {progress.totalChapters} 章 ({fillPercent}%)
        </span>
      </div>

      {/* ── 当前章节 ── */}
      {progress.currentChapter.index > 0 && (
        <div className="current-chapter">
          <span className="chapter-badge" style={{ backgroundColor: statusColor(progress.currentChapter.status) }}>
            {statusLabel(progress.currentChapter.status)}
          </span>
          <span className="chapter-index">第 {progress.currentChapter.index} 章</span>
          {progress.currentChapter.title && (
            <span className="chapter-title"> - {progress.currentChapter.title}</span>
          )}
        </div>
      )}

      {/* ── 时间信息 ── */}
      <div className="time-info">
        <span className="time-elapsed">已用 {formatElapsed(progress.elapsedMinutes)}</span>
        <span className="time-divider"> | </span>
        <span className="time-remaining">
          预计剩余 {formatTime(progress.estimatedRemainingMinutes)}
        </span>
      </div>

      {/* ── 统计面板 ── */}
      <div className="progress-stats">
        <div className="stat-item">
          <span className="stat-value">{progress.draftedCount}</span>
          <span className="stat-label">已起草</span>
        </div>
        <div className="stat-item stat-warning">
          <span className="stat-value">{progress.needsRepairCount}</span>
          <span className="stat-label">待修复</span>
        </div>
        <div className="stat-item stat-danger">
          <span className="stat-value">{progress.failedCount}</span>
          <span className="stat-label">失败</span>
        </div>
      </div>

      {/* ── 批次信息 ── */}
      {progress.batchInfo && progress.batchInfo.totalBatches > 0 && (
        <div className="batch-info">
          批次 {progress.batchInfo.currentBatch} / {progress.batchInfo.totalBatches}
          （每批 {progress.batchInfo.batchSize} 章）
        </div>
      )}
    </div>
  );
}

// ──────────────────── URL 构建 ────────────────────

function buildProgressUrl(target: ProgressTarget): string {
  const base = "/api/novels";
  switch (target.type) {
    case "novel":
      return `${base}/${target.novelId}/progress`;
    case "job":
      return `${base}/${target.novelId}/jobs/${target.jobId}/progress`;
    case "workflow":
      return `${base}/${target.novelId}/tasks/${target.taskId}/progress`;
  }
}
