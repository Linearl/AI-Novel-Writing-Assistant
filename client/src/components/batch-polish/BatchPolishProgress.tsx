import { Loader2, XCircle, CheckCircle2, AlertCircle, Clock, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { BatchPolishJobProgress, BatchPolishChapterProgress } from "@/api/batchStyle";

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  pending: "等待中",
  detecting: "检测中",
  polishing: "润色中",
  done: "已完成",
  error: "失败",
  skipped: "跳过",
  cancelled: "已取消",
};

function ChapterStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "error":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case "cancelled":
      return <Ban className="h-4 w-4 text-muted-foreground" />;
    case "detecting":
    case "polishing":
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function statusBadgeVariant(status: string): "success" | "warning" | "error" | "info" {
  switch (status) {
    case "done":
      return "success";
    case "error":
      return "error";
    case "detecting":
    case "polishing":
      return "info";
    case "cancelled":
      return "warning";
    default:
      return "info";
  }
}

// ---------------------------------------------------------------------------
// Chapter Row
// ---------------------------------------------------------------------------

function ChapterRow({ item }: { item: BatchPolishChapterProgress }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
      <ChapterStatusIcon status={item.status} />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">{item.chapterTitle}</span>
        {item.error && (
          <span className="text-xs text-destructive">{item.error}</span>
        )}
      </div>
      {item.riskScore !== null && item.riskScore !== undefined && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          风险 {item.riskScore}
        </span>
      )}
      {item.violationCount > 0 && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {item.violationCount} 处问题
        </span>
      )}
      <StatusBadge variant={statusBadgeVariant(item.status)}>
        {STATUS_LABELS[item.status] ?? item.status}
      </StatusBadge>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BatchPolishProgress
// ---------------------------------------------------------------------------

interface BatchPolishProgressProps {
  progress: BatchPolishJobProgress;
  onCancel: () => void;
}

export function BatchPolishProgress({ progress, onCancel }: BatchPolishProgressProps) {
  const isRunning = progress.status === "running";
  const isDone = progress.status === "done";

  // Aggregate stats
  const doneCount = progress.results.filter((r) => r.status === "done").length;
  const errorCount = progress.results.filter((r) => r.status === "error").length;
  const cancelledCount = progress.results.filter((r) => r.status === "cancelled").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {isRunning ? "批量润色进行中..." : isDone ? "批量润色完成" : `批量润色${STATUS_LABELS[progress.status] ?? ""}`}
          </CardTitle>
          {isRunning && (
            <Button variant="destructive" size="sm" onClick={onCancel}>
              <XCircle className="mr-1.5 h-3.5 w-3.5" />
              取消
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>总进度</span>
            <span>{progress.completedChapters}/{progress.totalChapters} 章 ({progress.percent}%)</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-4 text-xs text-muted-foreground">
          {doneCount > 0 && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              完成 {doneCount}
            </span>
          )}
          {errorCount > 0 && (
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-red-500" />
              失败 {errorCount}
            </span>
          )}
          {cancelledCount > 0 && (
            <span className="flex items-center gap-1">
              <Ban className="h-3 w-3 text-muted-foreground" />
              取消 {cancelledCount}
            </span>
          )}
        </div>

        {/* Chapter list */}
        <div className="max-h-64 overflow-y-auto">
          {progress.results.map((item) => (
            <ChapterRow key={item.chapterId} item={item} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

BatchPolishProgress.displayName = "BatchPolishProgress";
