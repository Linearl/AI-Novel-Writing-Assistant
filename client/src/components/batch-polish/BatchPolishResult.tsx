import { AlertTriangle, CheckCircle2, AlertCircle, Ban, RotateCcw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import type { BatchDetectionResult, BatchDetectChapterResult } from "@/api/batchStyle";
import type { BatchPolishJobProgress, BatchPolishChapterProgress } from "@/api/batchStyle";

// ---------------------------------------------------------------------------
// Detection Result
// ---------------------------------------------------------------------------

interface DetectionResultProps {
  result: BatchDetectionResult;
  onPolish: () => void;
  onReset: () => void;
}

export function DetectionResultDisplay({ result, onPolish, onReset }: DetectionResultProps) {
  const chaptersWithIssues = result.results.filter(
    (r) => r.detection.violations.length > 0,
  );
  const autoRewriteCount = chaptersWithIssues.reduce(
    (sum, r) => sum + r.detection.violations.filter((v) => v.canAutoRewrite).length,
    0,
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          批量检测结果
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="检测章节" value={result.chapterCount} />
          <StatCard label="问题总数" value={result.totalViolations} variant={result.totalViolations > 0 ? "warning" : "success"} />
          <StatCard label="平均风险" value={result.avgRiskScore} variant={result.avgRiskScore > 50 ? "error" : result.avgRiskScore > 20 ? "warning" : "success"} />
        </div>

        {/* Chapter detail list */}
        <div className="max-h-64 overflow-y-auto">
          {result.results.map((item) => (
            <DetectionChapterRow key={item.chapterId} item={item} />
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            onClick={onPolish}
            disabled={chaptersWithIssues.length === 0 || autoRewriteCount === 0}
            size="sm"
          >
            {autoRewriteCount > 0
              ? `自动润色 ${autoRewriteCount} 处问题`
              : "无自动可润色的问题"}
          </Button>
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            重新检测
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DetectionChapterRow({ item }: { item: BatchDetectChapterResult }) {
  const violationCount = item.detection.violations.length;
  const riskScore = item.detection.riskScore;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
      {violationCount === 0 ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
      )}
      <span className="flex-1 text-sm font-medium truncate">{item.chapterTitle}</span>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        风险 {riskScore}
      </span>
      {violationCount > 0 ? (
        <StatusBadge variant="warning">{violationCount} 处问题</StatusBadge>
      ) : (
        <StatusBadge variant="success">通过</StatusBadge>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Polish Result (after job completes)
// ---------------------------------------------------------------------------

interface PolishResultProps {
  progress: BatchPolishJobProgress;
  onReset: () => void;
}

export function PolishResultDisplay({ progress, onReset }: PolishResultProps) {
  const rewrittenCount = progress.rewrittenChapters ?? progress.results.filter((r) => r.status === "done").length;
  const skippedCount = progress.skippedChapters ?? progress.results.filter((r) => r.status === "skipped").length;
  const failedCount = progress.failedChapters ?? progress.results.filter((r) => r.status === "error").length;
  const cancelledCount = progress.results.filter((r) => r.status === "cancelled").length;

  const isAllCancelled = cancelledCount === progress.results.length && rewrittenCount === 0 && failedCount === 0;
  const isAllError = failedCount === progress.results.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {isAllCancelled ? (
            <Ban className="h-4 w-4 text-muted-foreground" />
          ) : isAllError ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          )}
          批量润色{isAllCancelled ? "已取消" : isAllError ? "出错" : "完成"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="已修复" value={rewrittenCount} variant="success" />
          <StatCard label="跳过" value={skippedCount} variant={skippedCount > 0 ? "info" : "success"} />
          <StatCard label="失败" value={failedCount} variant={failedCount > 0 ? "error" : "success"} />
        </div>

        {/* Chapter list */}
        <div className="max-h-64 overflow-y-auto">
          {progress.results.map((item) => (
            <PolishChapterRow key={item.chapterId} item={item} />
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={onReset}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
          重新开始
        </Button>
      </CardContent>
    </Card>
  );
}

function PolishChapterRow({ item }: { item: BatchPolishChapterProgress }) {
  const origRisk = item.originalRiskScore;
  const newRisk = item.newRiskScore;
  const showRiskChange = item.status === "done" && origRisk != null && newRisk != null;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
      {item.status === "done" ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
      ) : item.status === "error" ? (
        <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
      ) : item.status === "skipped" ? (
        <Ban className="h-4 w-4 text-muted-foreground shrink-0" />
      ) : item.status === "cancelled" ? (
        <Ban className="h-4 w-4 text-muted-foreground shrink-0" />
      ) : (
        <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{item.chapterTitle}</span>
        </div>
        {showRiskChange && (
          <div className="flex items-center gap-1 text-xs mt-0.5">
            <span className="text-muted-foreground">风险</span>
            <span className={(origRisk as number) > 35 ? "text-amber-600" : "text-muted-foreground"}>
              {origRisk}
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className={(newRisk as number) <= 35 ? "text-emerald-600" : "text-amber-600"}>
              {newRisk}
            </span>
            {item.issuesFixed > 0 && (
              <span className="text-emerald-600 ml-1">修复 {item.issuesFixed} 处</span>
            )}
          </div>
        )}
        {item.skippedReason && (
          <span className="text-xs text-muted-foreground mt-0.5 block truncate">
            {item.skippedReason}
          </span>
        )}
        {item.error && (
          <span className="text-xs text-red-500 mt-0.5 block truncate">
            {item.error}
          </span>
        )}
      </div>
      <StatusBadge variant={
        item.status === "done" ? "success"
          : item.status === "error" ? "error"
          : item.status === "skipped" ? "info"
          : "info"
      }>
        {item.status === "done" ? "已润色"
          : item.status === "error" ? "失败"
          : item.status === "skipped" ? "跳过"
          : item.status === "cancelled" ? "取消"
          : "处理中"}
      </StatusBadge>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  variant = "info",
}: {
  label: string;
  value: number;
  variant?: "success" | "warning" | "error" | "info";
}) {
  const colorMap = {
    success: "text-emerald-600",
    warning: "text-amber-600",
    error: "text-red-600",
    info: "text-foreground",
  };

  return (
    <div className="rounded-lg border border-border/50 p-3 text-center">
      <div className={`text-lg font-semibold ${colorMap[variant]}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

DetectionResultDisplay.displayName = "DetectionResultDisplay";
PolishResultDisplay.displayName = "PolishResultDisplay";
