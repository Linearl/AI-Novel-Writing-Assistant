import type { Chapter, ChapterRole, WaterContentAnalysis, WordCountTarget } from "@ai-novel/shared";
import { CHAPTER_ROLE_LABELS } from "@ai-novel/shared";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WordCountIndicatorProps {
  /** Actual word count (content length) */
  actualWordCount: number;
  /** Adaptive word count target from the chapter model */
  wordCountTarget?: WordCountTarget | null;
  /** Water content analysis result */
  waterContentAnalysis?: WaterContentAnalysis | null;
  /** Layout variant */
  variant?: "sidebar" | "compact" | "queue";
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type WordCountStatus = "under" | "in_range" | "close_over" | "over";

function getStatus(actual: number, target: WordCountTarget): WordCountStatus {
  const { min, max } = target;
  if (actual < min) return "under";
  if (actual > max) return "over";
  // Within range -- but check if close to the boundary (within 10% of range width)
  const rangeWidth = max - min;
  const closeThreshold = Math.max(rangeWidth * 0.1, 100);
  if (max - actual < closeThreshold) return "close_over";
  return "in_range";
}

function statusColor(status: WordCountStatus): string {
  switch (status) {
    case "under":
      return "text-warning";
    case "in_range":
      return "text-success";
    case "close_over":
      return "text-warning";
    case "over":
      return "text-destructive";
  }
}

function progressColor(status: WordCountStatus): string {
  switch (status) {
    case "under":
      return "bg-amber-500";
    case "in_range":
      return "bg-emerald-500";
    case "close_over":
      return "bg-amber-500";
    case "over":
      return "bg-red-500";
  }
}

function statusLabel(status: WordCountStatus): string {
  switch (status) {
    case "under":
      return "不足";
    case "in_range":
      return "达标";
    case "close_over":
      return "接近上限";
    case "over":
      return "超限";
  }
}

function roleLabel(role: ChapterRole): string {
  return CHAPTER_ROLE_LABELS[role] ?? role;
}

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return n.toLocaleString();
}

/* ------------------------------------------------------------------ */
/*  Progress Bar                                                       */
/* ------------------------------------------------------------------ */

function WordCountProgressBar(props: {
  actual: number;
  min: number;
  max: number;
  status: WordCountStatus;
}) {
  const { actual, min, max, status } = props;
  // The bar range goes from 0 to max * 1.3 so over-limit chapters are still visualized
  const barMax = Math.max(max * 1.3, actual * 1.1);
  const minPct = (min / barMax) * 100;
  const maxPct = (max / barMax) * 100;
  const actualPct = Math.min((actual / barMax) * 100, 100);

  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/50">
      {/* Target range zone (green background) */}
      <div
        className="absolute inset-y-0 bg-emerald-200/60 dark:bg-emerald-800/30"
        style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
      />
      {/* Actual word count indicator */}
      <div
        className={cn("absolute inset-y-0 left-0 rounded-full transition-all duration-300", progressColor(status))}
        style={{ width: `${actualPct}%` }}
      />
      {/* Min/max tick marks */}
      <div
        className="absolute inset-y-0 w-px bg-emerald-500/70"
        style={{ left: `${minPct}%` }}
      />
      <div
        className="absolute inset-y-0 w-px bg-emerald-500/70"
        style={{ left: `${maxPct}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Water Content Badge                                                */
/* ------------------------------------------------------------------ */

function WaterContentBadge(props: { analysis: WaterContentAnalysis }) {
  const { analysis } = props;
  const scorePct = Math.round(analysis.score * 100);

  if (!analysis.flagged) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        水文 {scorePct}%
      </span>
    );
  }

  return (
    <StatusBadge variant="warning" className="gap-1" title={`水文密度 ${scorePct}%，超过阈值。无效描写占比偏高，建议精简。`}>
      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
      水文 {scorePct}%
    </StatusBadge>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function WordCountIndicator(props: WordCountIndicatorProps) {
  const { actualWordCount, wordCountTarget, waterContentAnalysis, variant = "compact", className } = props;

  const hasTarget = Boolean(wordCountTarget?.min && wordCountTarget?.max);
  const status = hasTarget ? getStatus(actualWordCount, wordCountTarget!) : null;

  if (!hasTarget && !waterContentAnalysis) {
    // No data to show -- just display raw word count for backwards compat
    return null;
  }

  if (variant === "sidebar") {
    return (
      <div className={cn("space-y-2", className)}>
        {hasTarget && status ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">字数目标</span>
                <Badge variant="outline" className="rounded-full px-2 py-0 text-[11px]">
                  {roleLabel(wordCountTarget!.role)}
                </Badge>
              </div>
              <span className={cn("text-xs font-medium", statusColor(status))}>
                {statusLabel(status)}
              </span>
            </div>
            <div className="space-y-1">
              <WordCountProgressBar
                actual={actualWordCount}
                min={wordCountTarget!.min}
                max={wordCountTarget!.max}
                status={status}
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{formatNumber(wordCountTarget!.min)} ~ {formatNumber(wordCountTarget!.max)} 字</span>
                <span className={cn("font-medium", statusColor(status))}>
                  当前 {formatNumber(actualWordCount)} 字
                </span>
              </div>
            </div>
          </>
        ) : null}

        {waterContentAnalysis ? (
          <WaterContentBadge analysis={waterContentAnalysis} />
        ) : null}
      </div>
    );
  }

  if (variant === "queue") {
    return (
      <div className={cn("space-y-1.5", className)}>
        {hasTarget && status ? (
          <>
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="text-muted-foreground">
                目标 {formatNumber(wordCountTarget!.min)}~{formatNumber(wordCountTarget!.max)}
              </span>
              <span className={cn("font-medium", statusColor(status))}>
                {statusLabel(status)}
              </span>
            </div>
            <WordCountProgressBar
              actual={actualWordCount}
              min={wordCountTarget!.min}
              max={wordCountTarget!.max}
              status={status}
            />
          </>
        ) : null}

        {waterContentAnalysis?.flagged ? (
          <WaterContentBadge analysis={waterContentAnalysis} />
        ) : null}
      </div>
    );
  }

  // compact variant -- inline text + optional badge
  return (
    <span className={cn("inline-flex items-center gap-2 text-[11px]", className)}>
      {hasTarget && status ? (
        <>
          <span className="text-muted-foreground">
            {formatNumber(actualWordCount)} / {formatNumber(wordCountTarget!.min)}~{formatNumber(wordCountTarget!.max)}
          </span>
          <span className={cn("font-medium", statusColor(status))}>
            {statusLabel(status)}
          </span>
        </>
      ) : (
        <span className="text-muted-foreground">{formatNumber(actualWordCount)} 字</span>
      )}
      {waterContentAnalysis?.flagged ? (
        <WaterContentBadge analysis={waterContentAnalysis} />
      ) : null}
    </span>
  );
}
