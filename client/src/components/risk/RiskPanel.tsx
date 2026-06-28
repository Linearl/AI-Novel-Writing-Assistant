import { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { NovelRiskRecord, RiskAssessment, RiskStatus } from "@ai-novel/shared/types/novelRisk";
import { apiClient } from "@/api/client";
import { queryKeys } from "@/api/queryKeys";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, Download, AlertTriangle } from "lucide-react";

interface RiskPanelProps {
  novelId: string;
}

const SEVERITY_LABELS: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "严重",
};

const STATUS_LABELS: Record<string, string> = {
  open: "未处理",
  ignored: "已忽略",
  accepted: "已接受",
  resolved: "已修复",
  reopened: "已重开",
};

const TYPE_LABELS: Record<string, string> = {
  chapter: "章节",
  pipeline: "流水线",
  quality: "质量",
  resource: "资源",
  continuity: "连续性",
};

function severityVariant(severity: string): "default" | "secondary" | "destructive" | "outline" {
  if (severity === "critical") return "destructive";
  if (severity === "high") return "destructive";
  if (severity === "medium") return "secondary";
  return "outline";
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "open" || status === "reopened") return "destructive";
  if (status === "resolved") return "secondary";
  return "outline";
}

const STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "all", label: "全部" },
  { value: "open", label: "未处理" },
  { value: "accepted", label: "已接受" },
  { value: "ignored", label: "已忽略" },
  { value: "resolved", label: "已修复" },
  { value: "reopened", label: "已重开" },
];

export default function RiskPanel({ novelId }: RiskPanelProps) {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedRiskId, setExpandedRiskId] = useState<string | null>(null);
  const [detailDialogRisk, setDetailDialogRisk] = useState<NovelRiskRecord | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const filterKey = statusFilter === "all" ? "" : statusFilter;

  const risksQuery = useQuery({
    queryKey: queryKeys.risks.list(novelId, filterKey),
    queryFn: async () => {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const { data } = await apiClient.get<ApiResponse<NovelRiskRecord[]>>(`/novels/${novelId}/risks${params}`);
      return data.data ?? [];
    },
    enabled: Boolean(novelId),
  });

  const assessmentQuery = useQuery({
    queryKey: queryKeys.risks.assessment(novelId),
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<RiskAssessment>>(`/novels/${novelId}/risks/assessment`);
      return data.data;
    },
    enabled: Boolean(novelId),
  });

  const acceptMutation = useMutation({
    mutationFn: async (riskId: string) => {
      await apiClient.patch(`/novels/${novelId}/risks/${riskId}/status`, { status: "accepted" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.risks.all(novelId) });
    },
  });

  const ignoreMutation = useMutation({
    mutationFn: async (riskId: string) => {
      await apiClient.patch(`/novels/${novelId}/risks/${riskId}/status`, { status: "ignored" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.risks.all(novelId) });
    },
  });

  const reopenMutation = useMutation({
    mutationFn: async (riskId: string) => {
      await apiClient.post(`/novels/${novelId}/risks/${riskId}/reopen`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.risks.all(novelId) });
    },
  });

  const handleExport = useCallback(async (format: "json" | "md") => {
    const { data } = await apiClient.post<ApiResponse<{ format: string; content: string }>>(
      `/novels/${novelId}/risks/export`,
      {},
      { params: { format } },
    );
    const result = data.data;
    if (!result?.content) return;
    const mimeType = format === "md" ? "text/markdown" : "application/json";
    const extension = format === "md" ? "md" : "json";
    const blob = new Blob([result.content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `risk-report-${Date.now()}.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
    setExportDialogOpen(false);
  }, [novelId]);

  const risks = risksQuery.data ?? [];
  const assessment = assessmentQuery.data;
  const openRisks = risks.filter((r) => r.status === "open" || r.status === "reopened");

  const toggleExpand = useCallback((riskId: string) => {
    setExpandedRiskId((prev) => (prev === riskId ? null : riskId));
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">项目风险</CardTitle>
          <div className="flex items-center gap-2">
            {assessment?.warningLevel === "critical" ? (
              <Badge variant="destructive">{openRisks.length} 个未处理</Badge>
            ) : openRisks.length > 0 ? (
              <Badge variant="secondary">{openRisks.length} 个未处理</Badge>
            ) : (
              <Badge variant="outline">无风险</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Warning banner */}
        {assessment?.warningLevel === "critical" && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <div className="font-medium text-destructive">存在高影响风险</div>
              <div className="mt-0.5 text-muted-foreground">{assessment.plotImpactSummary}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{assessment.downstreamImpactEstimate}</div>
            </div>
          </div>
        )}

        {/* Filter + export row */}
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-8 text-xs"
            onClick={() => setExportDialogOpen(true)}
          >
            <Download className="mr-1 h-3 w-3" />
            导出
          </Button>
        </div>

        {/* Risk list */}
        {risksQuery.isLoading ? (
          <div className="py-4 text-center text-sm text-muted-foreground">加载中...</div>
        ) : risks.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">暂无风险记录</div>
        ) : (
          <div className="space-y-2">
            {risks.map((risk) => {
              const isExpanded = expandedRiskId === risk.id;
              return (
                <div key={risk.id} className="rounded-lg border text-sm">
                  {/* Risk header row - clickable */}
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 p-3 text-left hover:bg-muted/30"
                    onClick={() => toggleExpand(risk.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <Badge variant={severityVariant(risk.severity)} className="mt-0.5 shrink-0">
                      {SEVERITY_LABELS[risk.severity] ?? risk.severity}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{risk.title}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{TYPE_LABELS[risk.type] ?? risk.type}</span>
                        <span>·</span>
                        <Badge variant={statusVariant(risk.status)} className="text-[10px]">
                          {STATUS_LABELS[risk.status] ?? risk.status}
                        </Badge>
                        {risk.chapterRange ? (
                          <>
                            <span>·</span>
                            <span>{risk.chapterRange}</span>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t px-6 py-3 space-y-3 bg-muted/10">
                      {risk.description && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground">描述</div>
                          <div className="mt-0.5 text-sm">{risk.description}</div>
                        </div>
                      )}
                      {risk.impactAssessment && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground">影响评估</div>
                          <div className="mt-0.5 text-sm">{risk.impactAssessment}</div>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                        <span>创建: {new Date(risk.createdAt).toLocaleString("zh-CN")}</span>
                        {risk.resolvedAt && <span>· 修复: {new Date(risk.resolvedAt).toLocaleString("zh-CN")}</span>}
                        {risk.reopenedCount > 0 && <span>· 重开 {risk.reopenedCount} 次</span>}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {risk.status === "open" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => acceptMutation.mutate(risk.id)}
                              disabled={acceptMutation.isPending}
                            >
                              接受
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => ignoreMutation.mutate(risk.id)}
                              disabled={ignoreMutation.isPending}
                            >
                              忽略
                            </Button>
                          </>
                        )}
                        {(risk.status === "accepted" || risk.status === "ignored" || risk.status === "resolved") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => reopenMutation.mutate(risk.id)}
                            disabled={reopenMutation.isPending}
                          >
                            重新开放
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => setDetailDialogRisk(risk)}
                        >
                          查看详情
                        </Button>
                      </div>

                      {/* Audit log timeline */}
                      {risk.auditLogs && risk.auditLogs.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">操作记录</div>
                          <div className="space-y-1">
                            {risk.auditLogs.map((log) => (
                              <div key={log.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <span className="shrink-0">{new Date(log.createdAt).toLocaleString("zh-CN")}</span>
                                <span className="shrink-0 font-medium">
                                  {log.actor === "system" ? "系统" : "用户"}
                                </span>
                                <span>
                                  {log.prevStatus && log.newStatus
                                    ? `${STATUS_LABELS[log.prevStatus] ?? log.prevStatus} → ${STATUS_LABELS[log.newStatus] ?? log.newStatus}`
                                    : STATUS_LABELS[log.action] ?? log.action}
                                  {log.comment && `: ${log.comment}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Detail Dialog */}
      <Dialog open={Boolean(detailDialogRisk)} onOpenChange={(open) => { if (!open) setDetailDialogRisk(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{detailDialogRisk?.title}</DialogTitle>
          </DialogHeader>
          {detailDialogRisk && (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant={severityVariant(detailDialogRisk.severity)}>
                  严重性: {SEVERITY_LABELS[detailDialogRisk.severity]}
                </Badge>
                <Badge variant={statusVariant(detailDialogRisk.status)}>
                  状态: {STATUS_LABELS[detailDialogRisk.status]}
                </Badge>
                <Badge variant="outline">{TYPE_LABELS[detailDialogRisk.type]}</Badge>
              </div>

              {detailDialogRisk.description && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">描述</div>
                  <div>{detailDialogRisk.description}</div>
                </div>
              )}
              {detailDialogRisk.impactAssessment && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">影响评估</div>
                  <div>{detailDialogRisk.impactAssessment}</div>
                </div>
              )}
              {detailDialogRisk.chapterRange && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">章节范围</div>
                  <div>{detailDialogRisk.chapterRange}</div>
                </div>
              )}
              {detailDialogRisk.triggerSource && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-1">触发来源</div>
                  <div className="font-mono text-xs">{detailDialogRisk.triggerSource}</div>
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span>创建: {new Date(detailDialogRisk.createdAt).toLocaleString("zh-CN")}</span>
                <span>更新: {new Date(detailDialogRisk.updatedAt).toLocaleString("zh-CN")}</span>
                {detailDialogRisk.resolvedAt && <span>修复: {new Date(detailDialogRisk.resolvedAt).toLocaleString("zh-CN")}</span>}
                {detailDialogRisk.reopenedAt && <span>重开: {new Date(detailDialogRisk.reopenedAt).toLocaleString("zh-CN")}</span>}
                {detailDialogRisk.reopenedCount > 0 && <span>重开次数: {detailDialogRisk.reopenedCount}</span>}
              </div>

              {detailDialogRisk.auditLogs && detailDialogRisk.auditLogs.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">操作记录时间线</div>
                  <div className="space-y-2 border-l-2 border-muted pl-3">
                    {detailDialogRisk.auditLogs.map((log) => (
                      <div key={log.id} className="relative">
                        <div className="absolute -left-[1.1rem] top-1 h-2 w-2 rounded-full bg-muted-foreground" />
                        <div className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString("zh-CN")} · {log.actor === "system" ? "系统" : "用户"}
                        </div>
                        <div className="mt-0.5">
                          {log.prevStatus && log.newStatus
                            ? `${STATUS_LABELS[log.prevStatus] ?? log.prevStatus} → ${STATUS_LABELS[log.newStatus] ?? log.newStatus}`
                            : log.action}
                          {log.comment && ` — ${log.comment}`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">导出风险报告</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => handleExport("json")}>
              <Download className="mr-2 h-4 w-4" />
              JSON 格式
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => handleExport("md")}>
              <Download className="mr-2 h-4 w-4" />
              Markdown 格式
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
