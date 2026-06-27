import { useQuery } from "@tanstack/react-query";
import type { NovelRiskRecord, RiskAssessment } from "@ai-novel/shared/types/novelRisk";
import { apiClient } from "@/api/client";
import type { ApiResponse } from "@ai-novel/shared/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function RiskPanel({ novelId }: RiskPanelProps) {
  const risksQuery = useQuery({
    queryKey: ["novel-risks", novelId],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<NovelRiskRecord[]>>(`/novels/${novelId}/risks`);
      return data.data ?? [];
    },
    enabled: Boolean(novelId),
  });

  const assessmentQuery = useQuery({
    queryKey: ["novel-risk-assessment", novelId],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<RiskAssessment>>(`/novels/${novelId}/risks/assessment`);
      return data.data;
    },
    enabled: Boolean(novelId),
  });

  const risks = risksQuery.data ?? [];
  const assessment = assessmentQuery.data;
  const openRisks = risks.filter((r) => r.status === "open" || r.status === "reopened");

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
      <CardContent>
        {risksQuery.isLoading ? (
          <div className="py-4 text-center text-sm text-muted-foreground">加载中...</div>
        ) : risks.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">暂无风险记录</div>
        ) : (
          <div className="space-y-2">
            {risks.slice(0, 10).map((risk) => (
              <div
                key={risk.id}
                className="flex items-start gap-3 rounded-lg border p-3 text-sm"
              >
                <Badge variant={severityVariant(risk.severity)} className="mt-0.5 shrink-0">
                  {SEVERITY_LABELS[risk.severity] ?? risk.severity}
                </Badge>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{risk.title}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{TYPE_LABELS[risk.type] ?? risk.type}</span>
                    <span>·</span>
                    <span>{STATUS_LABELS[risk.status] ?? risk.status}</span>
                    {risk.chapterRange ? (
                      <>
                        <span>·</span>
                        <span>{risk.chapterRange}</span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
            {risks.length > 10 && (
              <div className="text-center text-xs text-muted-foreground">
                还有 {risks.length - 10} 条风险...
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
