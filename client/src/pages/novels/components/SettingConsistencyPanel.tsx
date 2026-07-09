/**
 * REQ-2038 T6-T8: SettingConsistencyPanel
 *
 * Displays consistency check report, with ignore and placeholder fix actions.
 */
import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw,
  ShieldCheck,
  Wrench,
  XCircle,
  EyeOff,
} from "lucide-react";
import type {
  Contradiction,
  ContradictionSeverity,
  SettingConsistencyReport,
} from "@ai-novel/shared/types/settingConsistency";
import {
  getConsistencyReport,
  ignoreContradiction,
  triggerConsistencyCheck,
} from "@/api/settingConsistency";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { toast } from "@/components/ui/toast";

/* ── Severity mapping ──────────────────────────────────────────────── */

const SEVERITY_CONFIG: Record<
  ContradictionSeverity,
  { label: string; icon: typeof AlertTriangle; className: string }
> = {
  critical: {
    label: "严重",
    icon: XCircle,
    className:
      "border-transparent bg-destructive/10 text-destructive",
  },
  warning: {
    label: "警告",
    icon: AlertTriangle,
    className:
      "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
  info: {
    label: "提示",
    icon: Info,
    className:
      "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  },
};

const SCORE_CONFIG: Record<
  SettingConsistencyReport["overallScore"],
  { label: string; icon: typeof CheckCircle2; color: string }
> = {
  pass: {
    label: "一致",
    icon: CheckCircle2,
    color: "text-emerald-600 dark:text-emerald-400",
  },
  warning: {
    label: "有隐患",
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
  },
  fail: {
    label: "不一致",
    icon: XCircle,
    color: "text-destructive",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  field_conflict: "字段冲突",
  timeline_conflict: "时间线矛盾",
  worldview_inconsistency: "世界观不一致",
};

/* ── Props ──────────────────────────────────────────────────────────── */

interface SettingConsistencyPanelProps {
  novelId: string;
  /** World settings JSON to send for the check. */
  worldSettings: Record<string, unknown>;
}

/* ── Component ──────────────────────────────────────────────────────── */

export default function SettingConsistencyPanel({
  novelId,
  worldSettings,
}: SettingConsistencyPanelProps) {
  const queryClient = useQueryClient();
  const [ignoredIds, setIgnoredIds] = useState<Set<string>>(new Set());

  /* Query: fetch existing report */
  const reportQuery = useQuery({
    queryKey: queryKeys.settings.consistencyReport(novelId),
    queryFn: () => getConsistencyReport(novelId),
    select: (res) => res?.data ?? null,
    retry: false,
  });

  /* Mutation: trigger check */
  const checkMutation = useMutation({
    mutationFn: () =>
      triggerConsistencyCheck(novelId, { settings: worldSettings }),
    onSuccess: (res) => {
      if (res.data) {
        queryClient.setQueryData(
          queryKeys.settings.consistencyReport(novelId),
          res,
        );
        const count = res.data.contradictions.length;
        if (count === 0) {
          toast.success("校验通过，未发现矛盾项。");
        } else {
          toast.success(`校验完成，发现 ${count} 个矛盾项。`);
        }
      }
    },
    onError: () => {
      toast.error("一致性校验失败，请稍后重试。");
    },
  });

  /* Mutation: ignore contradiction */
  const ignoreMutation = useMutation({
    mutationFn: (contradictionId: string) =>
      ignoreContradiction(novelId, contradictionId),
    onSuccess: (_, contradictionId) => {
      setIgnoredIds((prev) => new Set(prev).add(contradictionId));
      toast.success("已忽略该矛盾项。");
    },
    onError: () => {
      toast.error("忽略操作失败，请稍后重试。");
    },
  });

  /* Placeholder fix handler */
  const handleFix = useCallback((contradiction: Contradiction) => {
    toast.info(`修复建议：${contradiction.suggestion}`);
  }, []);

  const report = reportQuery.data;
  const isLoading = reportQuery.isLoading;
  const isChecking = checkMutation.isPending;
  const hasReport = report !== null && report !== undefined;

  /* Visible contradictions (filter out locally ignored) */
  const visibleContradictions = report?.contradictions.filter(
    (c) => !ignoredIds.has(c.id),
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <LoadingIndicator variant="spinner" className="py-8" />
      );
    }

    if (!hasReport) {
      return (
        <div className="py-6 text-center text-sm text-muted-foreground">
          暂无校验报告，点击上方按钮开始一致性校验。
        </div>
      );
    }

    const ScoreIcon = SCORE_CONFIG[report.overallScore].icon;
    const scoreColor = SCORE_CONFIG[report.overallScore].color;

    return (
      <div className="space-y-4">
        {/* Summary header */}
        <div className="flex items-start gap-3 rounded-md border border-border/60 bg-background/80 p-3">
          <ScoreIcon className={`mt-0.5 h-5 w-5 shrink-0 ${scoreColor}`} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">
                整体评估：{SCORE_CONFIG[report.overallScore].label}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(report.checkedAt).toLocaleString("zh-CN")}
              </span>
            </div>
            {report.summary ? (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {report.summary}
              </p>
            ) : null}
          </div>
        </div>

        {/* Contradiction list */}
        {visibleContradictions && visibleContradictions.length > 0 ? (
          <ul className="space-y-3" role="list">
            {visibleContradictions.map((c) => (
              <ContradictionItem
                key={c.id}
                item={c}
                isFixable={false}
                onFix={handleFix}
                onIgnore={() => ignoreMutation.mutate(c.id)}
                isIgnoring={ignoreMutation.isPending}
              />
            ))}
          </ul>
        ) : visibleContradictions && visibleContradictions.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
            className="py-6"
          >
            未发现矛盾项，设定一致性良好。
          </EmptyState>
        ) : null}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            设定一致性校验
          </CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isChecking}
            onClick={() => checkMutation.mutate()}
          >
            {isChecking ? (
              <LoadingIndicator variant="spinner" text="" size="sm" />
            ) : (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            )}
            {hasReport ? "重新校验" : "开始校验"}
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          对比世界观设定中的关键字段，检测可能的逻辑矛盾。
        </p>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}

/* ── Contradiction item sub-component ───────────────────────────────── */

interface ContradictionItemProps {
  item: Contradiction;
  isFixable: boolean;
  onFix: (item: Contradiction) => void;
  onIgnore: () => void;
  isIgnoring: boolean;
}

function ContradictionItem({
  item,
  isFixable,
  onFix,
  onIgnore,
  isIgnoring,
}: ContradictionItemProps) {
  const sev = SEVERITY_CONFIG[item.severity];
  const SevIcon = sev.icon;
  const categoryLabel = CATEGORY_LABELS[item.category] ?? item.category;

  return (
    <li className="rounded-md border border-border/60 bg-background/80 p-3">
      <div className="flex items-start gap-2">
        <Badge
          variant="outline"
          className={`mt-0.5 shrink-0 gap-1 text-[11px] ${sev.className}`}
        >
          <SevIcon className="h-3 w-3" />
          {sev.label}
        </Badge>
        <span className="text-[11px] text-muted-foreground">{categoryLabel}</span>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-foreground">
        {item.description}
      </p>

      {/* Field comparison */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          <span className="font-medium text-foreground">{item.fieldA}</span>
          {"：" + item.valueA}
        </span>
        <span className="text-border">|</span>
        <span>
          <span className="font-medium text-foreground">{item.fieldB}</span>
          {"：" + item.valueB}
        </span>
      </div>

      {item.suggestion ? (
        <p className="mt-2 rounded bg-muted/50 px-2.5 py-1.5 text-xs leading-relaxed text-muted-foreground">
          建议：{item.suggestion}
        </p>
      ) : null}

      {/* Actions */}
      <div className="mt-2.5 flex items-center gap-2">
        {isFixable ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => onFix(item)}
          >
            <Wrench className="h-3 w-3" />
            一键修复
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
          disabled={isIgnoring}
          onClick={onIgnore}
        >
          {isIgnoring ? (
            <LoadingIndicator variant="spinner" text="" size="sm" />
          ) : (
            <EyeOff className="h-3 w-3" />
          )}
          忽略
        </Button>
      </div>
    </li>
  );
}
