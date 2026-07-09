import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { queryLogs, type LogEntry, type LogLevel } from "@/api/logs";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { cn } from "@/lib/utils";

const LOG_LEVELS: LogLevel[] = ["error", "warn", "info", "http", "debug"];

function formatTimestamp(ts: string): string {
  if (!ts) return "-";
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts;
    return d.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return ts;
  }
}

function levelBadgeVariant(level: LogLevel): "destructive" | "secondary" | "outline" {
  switch (level) {
    case "error":
      return "destructive";
    case "warn":
      return "secondary";
    default:
      return "outline";
  }
}

function serializeLogParams(params: {
  level: string;
  keyword: string;
  page: number;
}): string {
  return JSON.stringify(params);
}

interface LogDetailDrawerProps {
  entry: LogEntry | null;
  onClose: () => void;
}

function LogDetailDrawer({ entry, onClose }: LogDetailDrawerProps) {
  if (!entry) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l bg-background shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-lg font-semibold">日志详情</h3>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            关闭
          </Button>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">时间：</span>
              <span>{formatTimestamp(entry.timestamp)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">级别：</span>
              <Badge variant={levelBadgeVariant(entry.level)}>{entry.level.toUpperCase()}</Badge>
            </div>
            {entry.errorId && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Error ID：</span>
                <span className="font-mono text-xs">{entry.errorId}</span>
              </div>
            )}
            {entry.method && (
              <div>
                <span className="text-muted-foreground">方法：</span>
                <span>{entry.method}</span>
              </div>
            )}
            {entry.url && (
              <div>
                <span className="text-muted-foreground">路径：</span>
                <span className="break-all text-xs">{entry.url}</span>
              </div>
            )}
          </div>

          <div>
            <div className="mb-1 text-sm font-medium text-muted-foreground">消息</div>
            <div className="rounded-md bg-muted/40 p-3 text-sm">{entry.message}</div>
          </div>

          {entry.stack && (
            <div>
              <div className="mb-1 text-sm font-medium text-muted-foreground">堆栈</div>
              <pre className="max-h-64 overflow-auto rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap">
                {entry.stack}
              </pre>
            </div>
          )}

          {entry.meta && Object.keys(entry.meta).length > 0 && (
            <div>
              <div className="mb-1 text-sm font-medium text-muted-foreground">元数据</div>
              <pre className="max-h-48 overflow-auto rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap">
                {JSON.stringify(entry.meta, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export default function LogCenterPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const highlightErrorId = searchParams.get("highlight") ?? undefined;

  const [level, setLevel] = useState<string>(searchParams.get("level") ?? "");
  const [keyword, setKeyword] = useState(searchParams.get("keyword") ?? "");
  const [appliedKeyword, setAppliedKeyword] = useState(searchParams.get("keyword") ?? "");
  const [page, setPage] = useState(Number(searchParams.get("page") ?? "1"));
  const [pageSize, setPageSize] = useState(Number(searchParams.get("pageSize") ?? "50"));
  const [detailEntry, setDetailEntry] = useState<LogEntry | null>(null);

  const listParams = useMemo(() => serializeLogParams({ level, keyword: appliedKeyword, page }), [level, appliedKeyword, page]);

  const logQuery = useQuery({
    queryKey: queryKeys.logs.list(listParams),
    queryFn: () =>
      queryLogs({
        level: (level || undefined) as LogLevel | undefined,
        keyword: appliedKeyword || undefined,
        page,
        pageSize,
      }),
    refetchInterval: 30_000,
  });

  const entries = logQuery.data?.data?.data ?? [];
  const total = logQuery.data?.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleSearch = useCallback(() => {
    setAppliedKeyword(keyword);
    setPage(1);
  }, [keyword]);

  const handleLevelChange = useCallback((value: string) => {
    setLevel(value === "all" ? "" : value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
    setSearchParams((prev) => {
      prev.set("page", String(newPage));
      return prev;
    });
  }, [setSearchParams]);

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">日志中心</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="w-40">
              <Select value={level || "all"} onValueChange={handleLevelChange}>
                <SelectTrigger>
                  <SelectValue placeholder="全部级别" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部级别</SelectItem>
                  {LOG_LEVELS.map((lv) => (
                    <SelectItem key={lv} value={lv}>
                      {lv.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Input
              placeholder="搜索关键词..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              className="max-w-xs"
            />

            <Button type="button" variant="secondary" onClick={handleSearch}>
              搜索
            </Button>

            <div className="ml-auto text-sm text-muted-foreground">
              共 {total} 条日志
            </div>
          </div>

          {logQuery.isLoading ? (
            <LoadingIndicator className="py-8" />
          ) : entries.length === 0 ? (
            <EmptyState className="py-8">暂无日志数据</EmptyState>
          ) : (
            <div className="space-y-2">
              {entries.map((entry, idx) => {
                const isHighlighted = entry.errorId && entry.errorId === highlightErrorId;
                return (
                  <button
                    key={`${entry.timestamp}-${idx}`}
                    type="button"
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/30",
                      isHighlighted && "border-primary bg-primary/5 ring-1 ring-primary/20",
                    )}
                    onClick={() => setDetailEntry(entry)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                      <Badge variant={levelBadgeVariant(entry.level)} className="text-[10px]">
                        {entry.level.toUpperCase()}
                      </Badge>
                      {entry.method && (
                        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                          {entry.method}
                        </span>
                      )}
                      {entry.errorId && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          ID: {entry.errorId.slice(0, 8)}...
                        </span>
                      )}
                      <span className="ml-auto text-xs text-muted-foreground">
                        {entry.url ?? ""}
                      </span>
                    </div>
                    <div className="mt-1 truncate text-sm">{entry.message}</div>
                  </button>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                下一页
              </Button>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} 条
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <LogDetailDrawer entry={detailEntry} onClose={() => setDetailEntry(null)} />
    </div>
  );
}
