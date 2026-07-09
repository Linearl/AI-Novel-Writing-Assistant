import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getNovelPayoffLedger } from "@/api/novel/planning";
import { queryKeys } from "@/api/queryKeys";
import type {
  PayoffLedgerItem,
  PayoffLedgerNormalizedStatus,
  PayoffLedgerSummary,
} from "@ai-novel/shared/types/novel";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_FILTERS: Array<{
  key: PayoffLedgerNormalizedStatus | "all";
  label: string;
}> = [
  { key: "all", label: "全部" },
  { key: "planted", label: "已埋设" },
  { key: "active", label: "进行中" },
  { key: "resolved", label: "已回收" },
  { key: "expired", label: "已过期" },
];

const STATUS_TONE: Record<PayoffLedgerNormalizedStatus, string> = {
  planted: "border-sky-300 bg-sky-50 text-sky-800",
  active: "border-amber-300 bg-amber-50 text-amber-800",
  resolved: "border-emerald-300 bg-emerald-50 text-emerald-800",
  expired: "border-red-400 bg-red-50 text-red-800",
};

const STATUS_LABEL: Record<PayoffLedgerNormalizedStatus, string> = {
  planted: "已埋设",
  active: "进行中",
  resolved: "已回收",
  expired: "已过期",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function resolveNormalized(item: PayoffLedgerItem): PayoffLedgerNormalizedStatus {
  if (item.normalizedStatus) return item.normalizedStatus;
  // Fallback mapping from currentStatus
  switch (item.currentStatus) {
    case "setup":
    case "hinted":
      return "planted";
    case "pending_payoff":
      return "active";
    case "paid_off":
    case "failed":
      return "resolved";
    case "overdue":
      return "expired";
    default:
      return "planted";
  }
}

function formatChapterRef(order: number | null | undefined): string {
  if (typeof order !== "number") return "--";
  return `第 ${order} 章`;
}

/* ------------------------------------------------------------------ */
/*  Status filter tabs                                                 */
/* ------------------------------------------------------------------ */

interface StatusFilterTabsProps {
  activeFilter: PayoffLedgerNormalizedStatus | "all";
  onFilterChange: (f: PayoffLedgerNormalizedStatus | "all") => void;
  counts: Record<PayoffLedgerNormalizedStatus | "all", number>;
}

function StatusFilterTabs({ activeFilter, onFilterChange, counts }: StatusFilterTabsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {STATUS_FILTERS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onFilterChange(key)}
          className={cn(
            "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
            activeFilter === key
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-background text-muted-foreground hover:bg-muted",
          )}
        >
          {label}
          <span className="ml-0.5 opacity-70">{counts[key]}</span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single payoff item row                                             */
/* ------------------------------------------------------------------ */

interface PayoffItemRowProps {
  item: PayoffLedgerItem;
  expiryThreshold: number;
}

function PayoffItemRow({ item, expiryThreshold }: PayoffItemRowProps) {
  const ns = resolveNormalized(item);
  const isExpired = ns === "expired";
  const elapsed = item.chaptersElapsed ?? 0;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        isExpired
          ? "border-red-300 bg-red-50/60"
          : "border-border/70 bg-background",
      )}
    >
      {/* Header row: title + badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground">{item.title}</span>
        <Badge
          variant={isExpired ? "destructive" : "outline"}
          className={cn(!isExpired && STATUS_TONE[ns])}
        >
          {STATUS_LABEL[ns]}
        </Badge>
        {isExpired && (
          <span className="text-[10px] font-semibold uppercase tracking-wide text-destructive">
            已过期
          </span>
        )}
      </div>

      {/* Summary */}
      {item.summary ? (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground line-clamp-2">
          {item.summary}
        </p>
      ) : null}

      {/* Meta row */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>
          埋设：{formatChapterRef(item.firstSeenChapterOrder ?? item.targetStartChapterOrder)}
        </span>
        <span>
          回收：{item.payoffChapterId ? formatChapterRef(item.targetEndChapterOrder) : "--"}
        </span>
        <span>
          跨越 <strong className="text-foreground">{elapsed}</strong> 章
          {isExpired && elapsed > expiryThreshold && (
            <span className="ml-1 text-destructive">
              (阈值 {expiryThreshold})
            </span>
          )}
        </span>
      </div>

      {/* Risk signals */}
      {item.riskSignals.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {item.riskSignals.slice(0, 3).map((signal, i) => (
            <span
              key={i}
              className={cn(
                "inline-block rounded px-1.5 py-0.5 text-[10px]",
                signal.severity === "critical" || signal.severity === "high"
                  ? "bg-red-100 text-destructive"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {signal.summary}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Expiry threshold config                                            */
/* ------------------------------------------------------------------ */

interface ExpiryThresholdConfigProps {
  value: number;
  onChange: (v: number) => void;
}

function ExpiryThresholdConfig({ value, onChange }: ExpiryThresholdConfigProps) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>过期阈值：</span>
      <input
        type="number"
        min={1}
        max={200}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (n > 0 && n <= 200) onChange(n);
        }}
        className="w-16 rounded border border-border bg-background px-1.5 py-0.5 text-center text-xs"
      />
      <span>章</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main panel                                                         */
/* ------------------------------------------------------------------ */

interface PayoffLedgerPanelProps {
  novelId: string;
  chapterOrder?: number;
}

const DEFAULT_EXPIRY_THRESHOLD = 20;

export default function PayoffLedgerPanel({ novelId, chapterOrder }: PayoffLedgerPanelProps) {
  const [activeFilter, setActiveFilter] = useState<PayoffLedgerNormalizedStatus | "all">("all");
  const [expiryThreshold, setExpiryThreshold] = useState(DEFAULT_EXPIRY_THRESHOLD);

  const payoffQuery = useQuery({
    queryKey: queryKeys.novels.payoffLedger(novelId, chapterOrder),
    queryFn: () => getNovelPayoffLedger(novelId, chapterOrder),
    enabled: Boolean(novelId),
    staleTime: 60_000,
  });

  const allItems = payoffQuery.data?.data?.items ?? [];
  const summary = extractLedgerSummary(payoffQuery.data?.data?.summary);

  // Normalize all items
  const normalizedItems = useMemo(
    () => allItems.map((item) => ({ item, ns: resolveNormalized(item) })),
    [allItems],
  );

  // Compute counts per status
  const counts = useMemo(() => {
    const c: Record<PayoffLedgerNormalizedStatus | "all", number> = {
      all: normalizedItems.length,
      planted: 0,
      active: 0,
      resolved: 0,
      expired: 0,
    };
    for (const { ns } of normalizedItems) {
      c[ns] += 1;
    }
    return c;
  }, [normalizedItems]);

  // Filter items
  const filteredItems = useMemo(
    () =>
      activeFilter === "all"
        ? normalizedItems
        : normalizedItems.filter(({ ns }) => ns === activeFilter),
    [normalizedItems, activeFilter],
  );

  // Sort: expired first (most urgent), then by chaptersElapsed desc
  const sortedItems = useMemo(
    () =>
      [...filteredItems].sort((a, b) => {
        if (a.ns === "expired" && b.ns !== "expired") return -1;
        if (a.ns !== "expired" && b.ns === "expired") return 1;
        return (b.item.chaptersElapsed ?? 0) - (a.item.chaptersElapsed ?? 0);
      }),
    [filteredItems],
  );

  if (payoffQuery.isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="text-sm text-muted-foreground">加载伏笔台账中...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <details className="group" open>
          <summary className="cursor-pointer list-none p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-foreground">伏笔追踪面板</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  管理和追踪小说中的所有伏笔埋设与回收状态
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline">共 {counts.all}</Badge>
                {counts.expired > 0 && (
                  <Badge variant="destructive">{counts.expired} 过期</Badge>
                )}
              </div>
            </div>
          </summary>

          <div className="space-y-3 border-t border-border/70 px-5 pb-5 pt-4">
            {/* Summary bar */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <SummaryCard label="待回收" count={counts.planted + counts.active} accent="sky" />
              <SummaryCard label="已回收" count={counts.resolved} accent="emerald" />
              <SummaryCard label="已过期" count={counts.expired} accent="red" />
              <SummaryCard label="紧急" count={summary.urgentCount} accent="amber" />
            </div>

            {/* Filter + threshold */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StatusFilterTabs
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                counts={counts}
              />
              <ExpiryThresholdConfig
                value={expiryThreshold}
                onChange={setExpiryThreshold}
              />
            </div>

            {/* Items list */}
            {sortedItems.length > 0 ? (
              <div className="space-y-2">
                {sortedItems.map(({ item }) => (
                  <PayoffItemRow
                    key={item.id}
                    item={item}
                    expiryThreshold={expiryThreshold}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground">
                {activeFilter === "all"
                  ? "当前还没有伏笔记录。auto-director 生成章节时会自动检测并添加伏笔。"
                  : `没有 ${STATUS_LABEL[activeFilter as PayoffLedgerNormalizedStatus]} 状态的伏笔。`}
              </div>
            )}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function extractLedgerSummary(summary: PayoffLedgerSummary | undefined) {
  return {
    pendingCount: summary?.pendingCount ?? 0,
    urgentCount: summary?.urgentCount ?? 0,
    overdueCount: summary?.overdueCount ?? 0,
    paidOffCount: summary?.paidOffCount ?? 0,
  };
}

function SummaryCard({
  label,
  count,
  accent,
}: {
  label: string;
  count: number;
  accent: "sky" | "emerald" | "red" | "amber";
}) {
  const tone = {
    sky: "border-sky-200 bg-sky-50/50",
    emerald: "border-emerald-200 bg-emerald-50/50",
    red: "border-red-200 bg-red-50/50",
    amber: "border-amber-200 bg-amber-50/50",
  }[accent];

  return (
    <div className={cn("rounded-lg border p-2.5", tone)}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-foreground">{count}</div>
    </div>
  );
}
