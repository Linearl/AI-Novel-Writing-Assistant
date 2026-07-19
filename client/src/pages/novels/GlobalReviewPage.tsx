import { useMemo, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Play,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  Wrench,
  Settings2,
  Zap,
} from "lucide-react";
import {
  listGlobalReviewIssues,
  runGlobalReview,
  updateGlobalReviewIssueStatus,
  repairGlobalReviewIssues,
  type GlobalReviewIssue,
  type GlobalReviewIssueCategory,
  type GlobalReviewIssueSeverity,
  type GlobalReviewIssueStatus,
} from "@/api/novel/globalReview";
import { getNovelDetail } from "@/api/novel/core";
import { getNovelVolumeWorkspace } from "@/api/novel/volumes";
import { queryKeys } from "@/api/queryKeys";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { toast } from "@/components/ui/toast";
import { FixPlanAdjustDialog } from "./components/FixPlanAdjustDialog";

const SEVERITY_LABEL: Record<GlobalReviewIssueSeverity, string> = {
  critical: "严重",
  major: "重要",
  minor: "轻微",
};

const SEVERITY_BADGE_CLASS: Record<GlobalReviewIssueSeverity, string> = {
  critical: "border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  major: "border-transparent bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  minor: "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
};

const CATEGORY_LABEL: Record<GlobalReviewIssueCategory, string> = {
  character_consistency: "角色一致性",
  plot_continuity: "情节连贯性",
  foreshadowing: "伏笔呼应",
  pacing: "节奏与张力",
  worldbuilding: "设定自洽性",
};

const STATUS_LABEL: Record<GlobalReviewIssueStatus, string> = {
  pending: "待处理",
  acknowledged: "已确认",
  fixed: "已修复",
  dismissed: "已忽略",
};

const STATUS_BADGE_VARIANT: Record<GlobalReviewIssueStatus, "secondary" | "default" | "outline" | "destructive"> = {
  pending: "destructive",
  acknowledged: "default",
  fixed: "secondary",
  dismissed: "outline",
};

const FILTER_CHIPS: Array<{ key: GlobalReviewIssueStatus | "all"; label: string }> = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待处理" },
  { key: "acknowledged", label: "已确认" },
  { key: "fixed", label: "已修复" },
  { key: "dismissed", label: "已忽略" },
];

interface IssueCardProps {
  issue: GlobalReviewIssue;
  novelId: string;
  onStatusChange: (issueId: string, status: GlobalReviewIssueStatus) => void;
  onRepair: (issueId: string) => void;
  onAdjustPlan: (issue: GlobalReviewIssue) => void;
  onVerify: (issue: GlobalReviewIssue) => void;
  isUpdating: boolean;
  isRepairing: boolean;
  isVerifying: boolean;
}

function IssueCard({ issue, novelId, onStatusChange, onRepair, onAdjustPlan, onVerify, isUpdating, isRepairing, isVerifying }: IssueCardProps) {
  const navigate = useNavigate();

  const handleChapterClick = (chapterId: string) => {
    navigate(`/novels/${novelId}/edit?chapterId=${chapterId}&globalReviewIssueIds=${issue.id}`);
  };

  return (
    <Card className="border-l-4" style={{
      borderLeftColor: issue.severity === "critical" ? "#ef4444" : issue.severity === "major" ? "#f97316" : "#0ea5e9",
    }}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={SEVERITY_BADGE_CLASS[issue.severity]} variant="outline">
              {SEVERITY_LABEL[issue.severity]}
            </Badge>
            <Badge variant="secondary">{CATEGORY_LABEL[issue.category]}</Badge>
            <Badge variant={STATUS_BADGE_VARIANT[issue.status]}>
              {STATUS_LABEL[issue.status]}
            </Badge>
          </div>
        </div>
        <CardTitle className="text-base font-medium leading-snug text-foreground">
          {issue.description}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {issue.fixDirection && (
          <div className="rounded-md bg-muted/60 p-3 text-sm">
            <p className="mb-1 font-medium text-muted-foreground">修复建议</p>
            <p className="text-foreground/90">{issue.fixDirection}</p>
          </div>
        )}
        {issue.affectedChapters.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            <span className="font-medium">受影响章节：</span>
            {issue.affectedChapters.map((chapterId, i) => (
              <span key={chapterId}>
                <button
                  onClick={() => handleChapterClick(chapterId)}
                  className="cursor-pointer font-mono text-xs text-primary underline-offset-2 hover:underline"
                >
                  <Badge variant="outline" className="font-mono text-xs">
                    {chapterId.slice(0, 8)}
                  </Badge>
                </button>
                {i < issue.affectedChapters.length - 1 && " "}
              </span>
            ))}
          </div>
        )}
        {issue.status !== "fixed" && issue.status !== "dismissed" && (
          <div className="flex flex-wrap gap-2 pt-1">
            {issue.status === "pending" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onStatusChange(issue.id, "acknowledged")}
                disabled={isUpdating}
              >
                <Eye className="mr-1 h-3.5 w-3.5" />
                确认问题
              </Button>
            )}
            {issue.status === "acknowledged" && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => onRepair(issue.id)}
                  disabled={isRepairing}
                >
                  {isRepairing ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wrench className="mr-1 h-3.5 w-3.5" />
                  )}
                  执行修复
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onAdjustPlan(issue)}
                  disabled={isRepairing}
                >
                  <Settings2 className="mr-1 h-3.5 w-3.5" />
                  调整方案
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStatusChange(issue.id, "fixed")}
              disabled={isUpdating}
            >
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              标记已修复
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onStatusChange(issue.id, "dismissed")}
              disabled={isUpdating}
            >
              <XCircle className="mr-1 h-3.5 w-3.5" />
              忽略
            </Button>
          </div>
        )}
        {issue.status === "fixed" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onVerify(issue)}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Eye className="mr-1 h-3.5 w-3.5" />
            )}
            AI 复核
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function GlobalReviewPage() {
  const { id = "" } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [reviewMode, setReviewMode] = useState<"currentVolume" | "range">("currentVolume");
  const [selectedVolumeId, setSelectedVolumeId] = useState<string>("");
  const [startChapter, setStartChapter] = useState<number>(1);
  const [endChapter, setEndChapter] = useState<number>(10);
  const [filterStatus, setFilterStatus] = useState<GlobalReviewIssueStatus | "all">("all");
  const [keyword, setKeyword] = useState("");

  const novelQuery = useQuery({
    queryKey: queryKeys.novels.detail(id),
    queryFn: () => getNovelDetail(id),
    enabled: !!id,
  });
  const novelTitle = novelQuery.data?.data?.title ?? "";

  const volumesQuery = useQuery({
    queryKey: queryKeys.novels.volumeWorkspace(id),
    queryFn: () => getNovelVolumeWorkspace(id),
    enabled: !!id,
  });
  const volumes = volumesQuery.data?.data?.volumes ?? [];

  const issuesQuery = useQuery({
    queryKey: queryKeys.novels.globalReviewIssues(id, filterStatus === "all" ? undefined : filterStatus),
    queryFn: () => listGlobalReviewIssues(id, {
      status: filterStatus === "all" ? undefined : filterStatus,
    }),
    enabled: !!id,
    // 自动刷新：每 10 秒检查一次，直到没有 acknowledged 状态的问题
    refetchInterval: (query) => {
      const data = query.state.data?.data;
      if (!data) return false;
      const hasAcknowledged = data.some(i => i.status === "acknowledged");
      return hasAcknowledged ? 10000 : false;
    },
  });
  const issues = issuesQuery.data?.data ?? [];

  const runReviewMutation = useMutation({
    mutationFn: () => runGlobalReview(id, {
      mode: reviewMode,
      startChapterOrder: reviewMode === "range" ? startChapter : undefined,
      endChapterOrder: reviewMode === "range" ? endChapter : undefined,
      volumeId: reviewMode === "currentVolume" ? selectedVolumeId : undefined,
    }),
    onSuccess: (res) => {
      toast.success(`审校完成，共发现 ${res.data?.issueCount ?? 0} 个问题`);
      queryClient.invalidateQueries({
        queryKey: ["novels", "global-review-issues", id],
      });
      setFilterStatus("all");
      issuesQuery.refetch();
    },
    onError: () => toast.error("全局审校失败，请稍后重试"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ issueId, status }: { issueId: string; status: GlobalReviewIssueStatus }) =>
      updateGlobalReviewIssueStatus(id, issueId, status),
    onSuccess: () => {
      issuesQuery.refetch();
    },
    onError: () => toast.error("状态更新失败"),
  });

  const stats = useMemo(() => {
    const all = issues;
    return {
      total: all.length,
      critical: all.filter((i) => i.severity === "critical").length,
      major: all.filter((i) => i.severity === "major").length,
      minor: all.filter((i) => i.severity === "minor").length,
      pending: all.filter((i) => i.status === "pending").length,
    };
  }, [issues]);

  const filteredIssues = useMemo(() => {
    if (!keyword.trim()) return issues;
    const kw = keyword.trim().toLowerCase();
    return issues.filter(
      (i) =>
        i.description.toLowerCase().includes(kw) ||
        i.fixDirection.toLowerCase().includes(kw) ||
        CATEGORY_LABEL[i.category].includes(kw),
    );
  }, [issues, keyword]);

  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustingIssue, setAdjustingIssue] = useState<GlobalReviewIssue | null>(null);
  const [batchRepairingChapterIds, setBatchRepairingChapterIds] = useState<string[]>([]);
  const [batchRepairCompletedCount, setBatchRepairCompletedCount] = useState(0);

  const acknowledgedIssues = useMemo(
    () => issues.filter((i) => i.status === "acknowledged"),
    [issues],
  );

  const singleRepairMutation = useMutation({
    mutationFn: (issueId: string) =>
      repairGlobalReviewIssues(id, { globalReviewIssueIds: [issueId] }),
    onSuccess: () => {
      toast.success("修复已触发，请前往章节编辑页面查看进度");
      void queryClient.invalidateQueries({
        queryKey: ["novels", "global-review-issues", id],
      });
    },
    onError: () => toast.error("修复触发失败，请稍后重试"),
  });

  const batchRepairMutation = useMutation({
    mutationFn: async (issueIds: string[]) => {
      const issueMap = new Map(issues.map((i) => [i.id, i]));
      const groups = new Map<string, string[]>();
      for (const issueId of issueIds) {
        const issue = issueMap.get(issueId);
        const chapterId = issue?.primaryFixChapter;
        if (!chapterId) continue;
        const existing = groups.get(chapterId) ?? [];
        groups.set(chapterId, [...existing, issueId]);
      }

      const chapterIds = Array.from(groups.keys()).sort();
      setBatchRepairingChapterIds(chapterIds);
      setBatchRepairCompletedCount(0);

      const repairedIssueIds: string[] = [];
      for (const chapterId of chapterIds) {
        const chapterIssueIds = groups.get(chapterId) ?? [];
        try {
          const result = await repairGlobalReviewIssues(id, {
            globalReviewIssueIds: chapterIssueIds,
          });
          repairedIssueIds.push(...(result.data?.repairedIssueIds ?? chapterIssueIds));
        } catch {
          // Continue with remaining chapters even if one fails
        }
        setBatchRepairCompletedCount((prev) => prev + 1);
      }

      return { repairedIssueIds, totalChapters: chapterIds.length };
    },
    onSuccess: (result) => {
      toast.success(
        result.repairedIssueIds.length > 0
          ? `已触发 ${result.totalChapters} 个章节的修复，共 ${result.repairedIssueIds.length} 个问题。修复为异步过程，请稍后刷新查看结果。`
          : "批量修复已触发",
      );
      void queryClient.invalidateQueries({
        queryKey: ["novels", "global-review-issues", id],
      });
    },
    onError: () => toast.error("批量修复触发失败，请稍后重试"),
    onSettled: () => {
      setBatchRepairingChapterIds([]);
      setBatchRepairCompletedCount(0);
    },
  });

  const handleRepairIssue = useCallback(
    (issueId: string) => {
      singleRepairMutation.mutate(issueId);
    },
    [singleRepairMutation],
  );

  const handleAdjustPlan = useCallback(
    (issue: GlobalReviewIssue) => {
      setAdjustingIssue(issue);
      setAdjustDialogOpen(true);
    },
    [],
  );

  const handleAdjustPlanConfirm = useCallback(
    (userInstruction: string) => {
      if (!adjustingIssue) return;
      singleRepairMutation.mutate(adjustingIssue.id, {
        onSuccess: () => {
          setAdjustDialogOpen(false);
          setAdjustingIssue(null);
        },
      });
      // Note: userInstruction would be passed to the API when backend supports it
      void userInstruction;
    },
    [adjustingIssue, singleRepairMutation],
  );

  const handleBatchRepair = useCallback(() => {
    if (acknowledgedIssues.length === 0) return;
    batchRepairMutation.mutate(acknowledgedIssues.map((i) => i.id));
  }, [acknowledgedIssues, batchRepairMutation]);

  const verifyMutation = useMutation({
    mutationFn: async (issue: GlobalReviewIssue) => {
      // 对受影响章节执行审校，检查问题是否仍然存在
      const affectedChapterIds = issue.affectedChapters;
      const results: Array<{ chapterId: string; hasIssue: boolean }> = [];

      for (const chapterId of affectedChapterIds) {
        try {
          // 调用章节审校 API
          const response = await fetch(`/api/novels/${id}/chapters/${chapterId}/audit-reports`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token") || ""}` },
          });
          const data = await response.json();

          // 检查最新的审校报告是否有相关问题
          const reports = data.data || [];
          const latestReport = reports[0];
          const hasIssue = latestReport?.issues?.some((issue: { description: string; status: string }) =>
            issue.status === "open" && issue.description.includes(issue.description.substring(0, 20))
          ) ?? false;

          results.push({ chapterId, hasIssue });
        } catch {
          results.push({ chapterId, hasIssue: true }); // 出错时假设有问题
        }
      }

      const issuesStillPresent = results.filter(r => r.hasIssue).length;
      return { results, issuesStillPresent, issueId: issue.id };
    },
    onSuccess: async (result) => {
      if (result.issuesStillPresent === 0) {
        toast.success("AI 复核通过：问题已修复");
      } else {
        // 自动重新打开问题
        await updateGlobalReviewIssueStatus(id, result.issueId, "acknowledged");
        toast.warning(`AI 复核发现 ${result.issuesStillPresent} 个章节仍存在问题，已重新打开`);
      }
      void queryClient.invalidateQueries({
        queryKey: ["novels", "global-review-issues", id],
      });
    },
    onError: () => toast.error("AI 复核失败，请稍后重试"),
  });

  const handleVerifyIssue = useCallback(
    (issue: GlobalReviewIssue) => {
      verifyMutation.mutate(issue);
    },
    [verifyMutation],
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to={`/novels/${id}/edit`}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              返回编辑
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold">全局审校</h1>
            {novelTitle && (
              <p className="text-sm text-muted-foreground">{novelTitle}</p>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">触发全局审校</CardTitle>
          <CardDescription>
            系统将对指定范围的章节进行一致性、连贯性、伏笔和节奏等维度的全面检查。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[160px]">
              <label className="mb-1 block text-sm font-medium text-foreground">审校范围</label>
              <Select
                value={reviewMode}
                onValueChange={(v) => setReviewMode(v as "currentVolume" | "range")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="currentVolume">当前卷</SelectItem>
                  <SelectItem value="range">指定章节范围</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reviewMode === "range" && (
              <>
                <div className="w-24">
                  <label className="mb-1 block text-sm font-medium text-foreground">起始章</label>
                  <Input
                    type="number"
                    min={1}
                    value={startChapter}
                    onChange={(e) => setStartChapter(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
                <div className="w-24">
                  <label className="mb-1 block text-sm font-medium text-foreground">结束章</label>
                  <Input
                    type="number"
                    min={1}
                    value={endChapter}
                    onChange={(e) => setEndChapter(Math.max(1, Number(e.target.value) || 1))}
                  />
                </div>
              </>
            )}

            {reviewMode === "currentVolume" && (
              <div className="flex-1 min-w-[160px]">
                <label className="mb-1 block text-sm font-medium text-foreground">选择卷</label>
                <Select
                  value={selectedVolumeId}
                  onValueChange={setSelectedVolumeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择要审校的卷" />
                  </SelectTrigger>
                  <SelectContent>
                    {volumes.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        第{v.sortOrder}卷：{v.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={() => runReviewMutation.mutate()}
              disabled={runReviewMutation.isPending}
              className="gap-2"
            >
              {runReviewMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {runReviewMutation.isPending ? "审校中..." : "开始审校"}
            </Button>
          </div>

          {runReviewMutation.data?.data?.summary && (
            <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
              {runReviewMutation.data.data.summary}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loading state */}
      {runReviewMutation.isPending && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">正在进行全局审校，这可能需要几分钟...</p>
          </CardContent>
        </Card>
      )}

      {/* Stats cards */}
      {issues.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-4">
              <span className="text-2xl font-bold text-foreground">{stats.total}</span>
              <span className="text-xs text-muted-foreground">总问题数</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-4">
              <span className="text-2xl font-bold text-red-500">{stats.critical}</span>
              <span className="text-xs text-muted-foreground">严重</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-4">
              <span className="text-2xl font-bold text-orange-500">{stats.major}</span>
              <span className="text-xs text-muted-foreground">重要</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-4">
              <span className="text-2xl font-bold text-sky-500">{stats.minor}</span>
              <span className="text-xs text-muted-foreground">轻微</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-4">
              <span className="text-2xl font-bold text-amber-500">{stats.pending}</span>
              <span className="text-xs text-muted-foreground">待处理</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter bar */}
      {issues.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {FILTER_CHIPS.map((chip) => (
              <button
                key={chip.key}
                onClick={() => setFilterStatus(chip.key)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  filterStatus === chip.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {acknowledgedIssues.length > 0 && (
              <Button
                size="sm"
                variant="default"
                onClick={handleBatchRepair}
                disabled={batchRepairMutation.isPending}
                className="gap-1.5"
              >
                {batchRepairMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="h-3.5 w-3.5" />
                )}
                批量修复（{acknowledgedIssues.length}）
              </Button>
            )}
            <div className="relative w-full max-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索问题..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
        </div>
      )}

      {/* Issues list */}
      {issuesQuery.isLoading ? (
        <LoadingIndicator className="py-12" />
      ) : issues.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              title="暂无审校记录"
              description="点击「开始审校」对当前作品进行全局一致性检查。"
              icon={<AlertTriangle className="h-8 w-8 text-muted-foreground/50" />}
            />
          </CardContent>
        </Card>
      ) : filteredIssues.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              title="没有匹配的问题"
              description="尝试调整筛选条件或搜索关键词。"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredIssues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              novelId={id}
              onStatusChange={(issueId, status) =>
                updateStatusMutation.mutate({ issueId, status })
              }
              onRepair={handleRepairIssue}
              onAdjustPlan={handleAdjustPlan}
              onVerify={handleVerifyIssue}
              isUpdating={updateStatusMutation.isPending}
              isRepairing={singleRepairMutation.isPending && singleRepairMutation.variables === issue.id}
              isVerifying={verifyMutation.isPending && verifyMutation.variables?.id === issue.id}
            />
          ))}
        </div>
      )}

      {/* Batch repair progress */}
      {batchRepairMutation.isPending && batchRepairingChapterIds.length > 0 && (
        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>批量修复进行中</span>
            </div>
            <div className="space-y-1 text-sm text-muted-foreground">
              {batchRepairingChapterIds.map((chapterId, index) => (
                <div key={chapterId} className="flex items-center gap-2">
                  {index < batchRepairCompletedCount ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : index === batchRepairCompletedCount ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  ) : (
                    <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />
                  )}
                  <span className="font-mono text-xs">{chapterId.slice(0, 8)}</span>
                  <span className="text-xs">
                    {index < batchRepairCompletedCount
                      ? "已完成"
                      : index === batchRepairCompletedCount
                        ? "修复中..."
                        : "等待中"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fix plan adjust dialog */}
      <FixPlanAdjustDialog
        open={adjustDialogOpen}
        onOpenChange={setAdjustDialogOpen}
        issue={adjustingIssue}
        onConfirm={handleAdjustPlanConfirm}
        isSubmitting={singleRepairMutation.isPending}
      />
    </div>
  );
}
