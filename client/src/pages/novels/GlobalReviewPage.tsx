import { useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
  Filter,
  SlidersHorizontal,
  RefreshCw,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

// ── Constants ────────────────────────────────────────────────────────────────

const SEVERITY_LABEL: Record<GlobalReviewIssueSeverity, string> = {
  critical: "严重",
  major: "重要",
  minor: "轻微",
};

const SEVERITY_BADGE_CLASS: Record<GlobalReviewIssueSeverity, string> = {
  critical:
    "border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  major: "border-transparent bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  minor: "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
};

const SEVERITY_FILTER_OPTIONS: Array<{
  key: GlobalReviewIssueSeverity | "all";
  label: string;
  color: string;
}> = [
  { key: "all", label: "全部", color: "text-muted-foreground" },
  { key: "critical", label: "严重", color: "text-red-500" },
  { key: "major", label: "重要", color: "text-orange-500" },
  { key: "minor", label: "轻微", color: "text-sky-500" },
];

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

const STATUS_FILTER_OPTIONS: Array<{
  key: GlobalReviewIssueStatus | "all";
  label: string;
}> = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待处理" },
  { key: "acknowledged", label: "已确认" },
  { key: "fixed", label: "已修复" },
  { key: "dismissed", label: "已忽略" },
];

const STATUS_BADGE_VARIANT: Record<
  GlobalReviewIssueStatus,
  "secondary" | "default" | "outline" | "destructive"
> = {
  pending: "destructive",
  acknowledged: "default",
  fixed: "secondary",
  dismissed: "outline",
};

// ── IssueCard ────────────────────────────────────────────────────────────────

interface IssueCardProps {
  issue: GlobalReviewIssue;
  novelId: string;
  chapters: Array<{ id: string; order: number }>;
  onStatusChange: (issueId: string, status: GlobalReviewIssueStatus) => void;
  onRepair: (issueId: string) => void;
  onAdjustPlan: (issue: GlobalReviewIssue) => void;
  onVerify: (issue: GlobalReviewIssue) => void;
  isUpdating: boolean;
  isRepairing: boolean;
  isVerifying: boolean;
  isBatchRepairing?: boolean;
}

function IssueCard({
  issue,
  novelId,
  chapters,
  onStatusChange,
  onRepair,
  onAdjustPlan,
  onVerify,
  isUpdating,
  isRepairing,
  isVerifying,
  isBatchRepairing,
}: IssueCardProps) {
  const navigate = useNavigate();

  const handleChapterClick = (chapterId: string, index: number) => {
    // Resolve ch_N format to actual CUID using affectedChapterOrders
    let resolvedId = chapterId;
    const orders = issue.affectedChapterOrders ?? [];
    if (orders[index] != null) {
      const match = chapters.find((c) => c.order === orders[index]);
      if (match) resolvedId = match.id;
    }
    navigate(
      `/novels/${novelId}/edit?chapterId=${resolvedId}&globalReviewIssueIds=${issue.id}`,
    );
  };

  const formatChapterLabel = (index: number): string => {
    const orders = issue.affectedChapterOrders ?? [];
    if (orders[index] != null) {
      return `第${orders[index]}章`;
    }
    const id = issue.affectedChapters[index];
    return id ? id.slice(0, 8) : "";
  };

  return (
    <Card
      className="border-l-4"
      style={{
        borderLeftColor:
          issue.severity === "critical"
            ? "#ef4444"
            : issue.severity === "major"
              ? "#f97316"
              : "#0ea5e9",
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {issue.issueNumber != null && (
              <Badge variant="default" className="font-mono text-xs">
                #G{String(issue.issueNumber).padStart(3, "0")}
              </Badge>
            )}
            <Badge
              className={SEVERITY_BADGE_CLASS[issue.severity]}
              variant="outline"
            >
              {SEVERITY_LABEL[issue.severity]}
            </Badge>
            <Badge variant="secondary">
              {CATEGORY_LABEL[issue.category]}
            </Badge>
            <Badge variant={STATUS_BADGE_VARIANT[issue.status]}>
              {STATUS_LABEL[issue.status]}
            </Badge>
            {isBatchRepairing && (
              <Badge
                variant="outline"
                className="gap-1 border-blue-500 text-blue-500"
              >
                <CheckCircle2 className="h-3 w-3" />
                已触发修复
              </Badge>
            )}
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
                  onClick={() => handleChapterClick(chapterId, i)}
                  className="cursor-pointer text-xs text-primary underline-offset-2 hover:underline"
                >
                  <Badge variant="outline" className="text-xs">
                    {formatChapterLabel(i)}
                  </Badge>
                </button>
                {i < issue.affectedChapters.length - 1 && " "}
              </span>
            ))}
          </div>
        )}
        {/* Action buttons for pending / acknowledged issues */}
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
        {/* AI复核按钮 (fixed 状态) */}
        {issue.status === "fixed" && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onVerify(issue)}
              disabled={isVerifying}
              title={`将检查 ${issue.affectedChapters.length} 个受影响章节`}
            >
              {isVerifying ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Eye className="mr-1 h-3.5 w-3.5" />
              )}
              AI 复核 ({issue.affectedChapters.length}章)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function GlobalReviewPage() {
  const { id = "" } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  // Review trigger form state
  const [reviewMode, setReviewMode] = useState<"currentVolume" | "range">(
    "currentVolume",
  );
  const [selectedVolumeId, setSelectedVolumeId] = useState<string>("");
  const [startChapter, setStartChapter] = useState<number>(1);
  const [endChapter, setEndChapter] = useState<number>(10);

  // Filter state (left column)
  const [filterStatus, setFilterStatus] = useState<
    GlobalReviewIssueStatus | "all"
  >("all");
  const [filterSeverity, setFilterSeverity] = useState<
    GlobalReviewIssueSeverity | "all"
  >("all");
  const [keyword, setKeyword] = useState("");

  // ── Data queries ─────────────────────────────────────────────────────────

  const novelQuery = useQuery({
    queryKey: queryKeys.novels.detail(id),
    queryFn: () => getNovelDetail(id),
    enabled: !!id,
  });
  const novelTitle = novelQuery.data?.data?.title ?? "";
  const chapters = novelQuery.data?.data?.chapters ?? [];

  const volumesQuery = useQuery({
    queryKey: queryKeys.novels.volumeWorkspace(id),
    queryFn: () => getNovelVolumeWorkspace(id),
    enabled: !!id,
  });
  const volumes = volumesQuery.data?.data?.volumes ?? [];

  const issuesQuery = useQuery({
    queryKey: queryKeys.novels.globalReviewIssues(
      id,
      filterStatus === "all" ? undefined : filterStatus,
    ),
    queryFn: () =>
      listGlobalReviewIssues(id, {
        status: filterStatus === "all" ? undefined : filterStatus,
      }),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data?.data;
      if (!data) return false;
      const hasAcknowledged = data.some((i) => i.status === "acknowledged");
      return hasAcknowledged ? 10000 : false;
    },
  });
  const issues = issuesQuery.data?.data ?? [];

  // ── Mutations ─────────────────────────────────────────────────────────────

  const runReviewMutation = useMutation({
    mutationFn: () =>
      runGlobalReview(id, {
        mode: reviewMode,
        startChapterOrder: reviewMode === "range" ? startChapter : undefined,
        endChapterOrder: reviewMode === "range" ? endChapter : undefined,
        volumeId: reviewMode === "currentVolume" ? selectedVolumeId : undefined,
      }),
    onSuccess: (res) => {
      toast.success(
        `审校完成，共发现 ${res.data?.issueCount ?? 0} 个问题`,
      );
      queryClient.invalidateQueries({
        queryKey: ["novels", "global-review-issues", id],
      });
      setFilterStatus("all");
      setFilterSeverity("all");
      issuesQuery.refetch();
    },
    onError: () => toast.error("全局审校失败，请稍后重试"),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      issueId,
      status,
    }: {
      issueId: string;
      status: GlobalReviewIssueStatus;
    }) => updateGlobalReviewIssueStatus(id, issueId, status),
    onSuccess: () => {
      issuesQuery.refetch();
    },
    onError: () => toast.error("状态更新失败"),
  });

  // ── Derived state ─────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    return {
      total: issues.length,
      critical: issues.filter((i) => i.severity === "critical").length,
      major: issues.filter((i) => i.severity === "major").length,
      minor: issues.filter((i) => i.severity === "minor").length,
      pending: issues.filter((i) => i.status === "pending").length,
    };
  }, [issues]);

  const filteredIssues = useMemo(() => {
    let result = issues;
    if (filterStatus !== "all") {
      result = result.filter((i) => i.status === filterStatus);
    }
    if (filterSeverity !== "all") {
      result = result.filter((i) => i.severity === filterSeverity);
    }
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      result = result.filter(
        (i) =>
          i.description.toLowerCase().includes(kw) ||
          i.fixDirection.toLowerCase().includes(kw) ||
          CATEGORY_LABEL[i.category].includes(kw),
      );
    }
    return result;
  }, [issues, filterStatus, filterSeverity, keyword]);

  // ── Dialog state ──────────────────────────────────────────────────────────

  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustingIssue, setAdjustingIssue] =
    useState<GlobalReviewIssue | null>(null);

  // ── Batch repair state ────────────────────────────────────────────────────

  const [batchRepairingChapterIds, setBatchRepairingChapterIds] = useState<
    string[]
  >([]);
  const [batchRepairCompletedCount, setBatchRepairCompletedCount] = useState(0);
  const [isBatchRepairing, setIsBatchRepairing] = useState(false);
  const [batchRepairChapterIssueMap, setBatchRepairChapterIssueMap] = useState<
    Map<string, string[]>
  >(new Map());

  const acknowledgedIssues = useMemo(
    () => issues.filter((i) => i.status === "acknowledged"),
    [issues],
  );

  // ── Mutations (repair) ────────────────────────────────────────────────────

  const singleRepairMutation = useMutation({
    mutationFn: (issueId: string) => {
      const issue = issues.find((i) => i.id === issueId);
      const feedback = issue?.verificationFeedback;
      return repairGlobalReviewIssues(id, {
        globalReviewIssueIds: [issueId],
        userInstruction: feedback
          ? `复核反馈：${feedback}`
          : undefined,
      });
    },
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
      setBatchRepairChapterIssueMap(groups);
      setIsBatchRepairing(true);

      const repairedIssueIds: string[] = [];
      for (const chapterId of chapterIds) {
        const chapterIssueIds = groups.get(chapterId) ?? [];
        try {
          const feedbacks: string[] = [];
          for (const issueId of chapterIssueIds) {
            const issue = issues.find((i) => i.id === issueId);
            if (issue?.verificationFeedback) {
              feedbacks.push(
                `[${issueId.slice(0, 8)}] ${issue.verificationFeedback}`,
              );
            }
          }
          const result = await repairGlobalReviewIssues(id, {
            globalReviewIssueIds: chapterIssueIds,
            userInstruction:
              feedbacks.length > 0
                ? `复核反馈：\n${feedbacks.join("\n")}`
                : undefined,
          });
          repairedIssueIds.push(
            ...(result.data?.repairedIssueIds ?? chapterIssueIds),
          );
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
    onError: () => {
      toast.error("批量修复触发失败，请稍后重试");
      setIsBatchRepairing(false);
    },
    onSettled: () => {
      setBatchRepairingChapterIds([]);
      setBatchRepairCompletedCount(0);
      setBatchRepairChapterIssueMap(new Map());
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleRepairIssue = useCallback(
    (issueId: string) => {
      singleRepairMutation.mutate(issueId);
    },
    [singleRepairMutation],
  );

  const handleAdjustPlan = useCallback((issue: GlobalReviewIssue) => {
    setAdjustingIssue(issue);
    setAdjustDialogOpen(true);
  }, []);

  const handleAdjustPlanConfirm = useCallback(
    (userInstruction: string) => {
      if (!adjustingIssue) return;
      singleRepairMutation.mutate(adjustingIssue.id, {
        onSuccess: () => {
          setAdjustDialogOpen(false);
          setAdjustingIssue(null);
        },
      });
      void userInstruction;
    },
    [adjustingIssue, singleRepairMutation],
  );

  const handleBatchRepair = useCallback(() => {
    if (acknowledgedIssues.length === 0) return;
    batchRepairMutation.mutate(
      acknowledgedIssues.map((i) => i.id),
    );
  }, [acknowledgedIssues, batchRepairMutation]);

  // ── Verify mutation (AI 复核) ─────────────────────────────────────────────

  const verifyMutation = useMutation({
    mutationFn: async (issue: GlobalReviewIssue) => {
      const affectedChapterIds = issue.affectedChapters;
      const results: Array<{ chapterId: string; hasIssue: boolean }> = [];

      for (const chapterId of affectedChapterIds) {
        try {
          const response = await fetch(
            `/api/novels/${id}/chapters/${chapterId}/audit-reports`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
              },
            },
          );
          const data = await response.json();

          const reports = data.data || [];
          const latestReport = reports[0];
          const hasIssue =
            latestReport?.issues?.some(
              (
                reportIssue: { description: string; status: string },
              ) =>
                reportIssue.status === "open" &&
                reportIssue.description.includes(
                  issue.description.substring(0, 20),
                ),
            ) ?? false;

          results.push({ chapterId, hasIssue });
        } catch {
          results.push({ chapterId, hasIssue: true });
        }
      }

      const issuesStillPresent = results.filter((r) => r.hasIssue).length;
      return { results, issuesStillPresent, issueId: issue.id };
    },
    onSuccess: async (result) => {
      if (result.issuesStillPresent === 0) {
        toast.success("AI 复核通过：问题已修复");
      } else {
        const feedback = `[复核反馈 ${new Date().toLocaleDateString()}] 复核发现 ${result.issuesStillPresent} 个章节仍存在问题。`;
        await updateGlobalReviewIssueStatus(
          id,
          result.issueId,
          "acknowledged",
          undefined,
          feedback,
        );
        toast.warning(
          `AI 复核发现 ${result.issuesStillPresent} 个章节仍存在问题，已重新打开`,
        );
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

  // ── Derived: batch repair progress labels ──────────────────────────────────

  /** Map of chapterId -> "#G001 #G002 ..." for all issues in the batch repair */
  const allIssueLabelsByChapter = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const [chapterId, issueIds] of batchRepairChapterIssueMap.entries()) {
      const labels = issueIds
        .map((iid) => {
          const issue = issues.find((i) => i.id === iid);
          if (issue?.issueNumber != null) {
            return `#G${String(issue.issueNumber).padStart(3, "0")}`;
          }
          return `#${iid.slice(0, 6)}`;
        });
      map.set(chapterId, labels);
    }
    return map;
  }, [batchRepairChapterIssueMap, issues]);

  /** Flat list of all affected issue labels across all chapters */
  const allAffectedIssueLabels = useMemo(() => {
    const labels: string[] = [];
    for (const chapterId of batchRepairingChapterIds) {
      const chapterLabels = allIssueLabelsByChapter.get(chapterId) ?? [];
      labels.push(...chapterLabels);
    }
    return labels;
  }, [batchRepairingChapterIds, allIssueLabelsByChapter]);

  /** Labels for the chapter currently being processed */
  const currentChapterIssueLabels = useMemo(() => {
    const currentChapterId =
      batchRepairingChapterIds[batchRepairCompletedCount];
    if (!currentChapterId) return [];
    return allIssueLabelsByChapter.get(currentChapterId) ?? [];
  }, [
    batchRepairCompletedCount,
    batchRepairingChapterIds,
    allIssueLabelsByChapter,
  ]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">全局审校</h1>
          {novelTitle && (
            <p className="text-sm text-muted-foreground">{novelTitle}</p>
          )}
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
            <div className="min-w-[160px] flex-1">
              <label className="mb-1 block text-sm font-medium text-foreground">
                审校范围
              </label>
              <Select
                value={reviewMode}
                onValueChange={(v) =>
                  setReviewMode(v as "currentVolume" | "range")
                }
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
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    起始章
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={startChapter}
                    onChange={(e) =>
                      setStartChapter(
                        Math.max(1, Number(e.target.value) || 1),
                      )
                    }
                  />
                </div>
                <div className="w-24">
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    结束章
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={endChapter}
                    onChange={(e) =>
                      setEndChapter(
                        Math.max(1, Number(e.target.value) || 1),
                      )
                    }
                  />
                </div>
              </>
            )}

            {reviewMode === "currentVolume" && (
              <div className="min-w-[160px] flex-1">
                <label className="mb-1 block text-sm font-medium text-foreground">
                  选择卷
                </label>
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
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              正在进行全局审校，这可能需要几分钟...
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats cards */}
      {issues.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-4">
              <span className="text-2xl font-bold text-foreground">
                {stats.total}
              </span>
              <span className="text-xs text-muted-foreground">总问题数</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-4">
              <span className="text-2xl font-bold text-red-500">
                {stats.critical}
              </span>
              <span className="text-xs text-muted-foreground">严重</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-4">
              <span className="text-2xl font-bold text-orange-500">
                {stats.major}
              </span>
              <span className="text-xs text-muted-foreground">重要</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-4">
              <span className="text-2xl font-bold text-sky-500">
                {stats.minor}
              </span>
              <span className="text-xs text-muted-foreground">轻微</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-4">
              <span className="text-2xl font-bold text-amber-500">
                {stats.pending}
              </span>
              <span className="text-xs text-muted-foreground">待处理</span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Three-column layout */}
      {/* ── Left column: Filter Panel (240px) | Center: Issues (1fr) | Right: Progress (280px) ── */}
      <div className="grid gap-4 lg:grid-cols-[240px_1fr] xl:grid-cols-[240px_1fr_280px]">
        {/* ── LEFT: Filter panel ── */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:h-fit lg:self-start">
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <SlidersHorizontal className="h-4 w-4" />
                筛选
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status filter */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  状态
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setFilterStatus(opt.key)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        filterStatus === opt.key
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Severity filter */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  严重程度
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SEVERITY_FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setFilterSeverity(opt.key)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                        filterSeverity === opt.key
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {opt.key !== "all" && (
                        <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${opt.color === "text-red-500" ? "bg-red-500" : opt.color === "text-orange-500" ? "bg-orange-500" : opt.color === "text-sky-500" ? "bg-sky-500" : ""}`} />
                      )}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Keyword search */}
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  搜索
                </p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="搜索问题..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="h-8 pl-8 text-sm"
                  />
                </div>
              </div>

              {/* Active filter count */}
              {(filterStatus !== "all" || filterSeverity !== "all" || keyword.trim()) && (
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    已筛选 {filteredIssues.length}/{issues.length} 个问题
                  </span>
                  <button
                    onClick={() => {
                      setFilterStatus("all");
                      setFilterSeverity("all");
                      setKeyword("");
                    }}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    清除筛选
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Batch repair trigger button (mobile-friendly placement in left panel) */}
          {acknowledgedIssues.length > 0 && (
            <Button
              onClick={handleBatchRepair}
              disabled={batchRepairMutation.isPending}
              className="w-full gap-2"
            >
              {batchRepairMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              批量修复（{acknowledgedIssues.length}）
            </Button>
          )}
        </aside>

        {/* ── CENTER: Issue list ── */}
        <main className="min-w-0">
          {issuesQuery.isLoading ? (
            <LoadingIndicator className="py-12" />
          ) : issues.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  title="暂无审校记录"
                  description="点击「开始审校」对当前作品进行全局一致性检查。"
                  icon={
                    <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
                  }
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
                  chapters={chapters}
                  onStatusChange={(issueId, status) =>
                    updateStatusMutation.mutate({ issueId, status })
                  }
                  onRepair={handleRepairIssue}
                  onAdjustPlan={handleAdjustPlan}
                  onVerify={handleVerifyIssue}
                  isUpdating={updateStatusMutation.isPending}
                  isRepairing={
                    singleRepairMutation.isPending &&
                    singleRepairMutation.variables === issue.id
                  }
                  isVerifying={
                    verifyMutation.isPending &&
                    verifyMutation.variables?.id === issue.id
                  }
                  isBatchRepairing={
                    isBatchRepairing &&
                    issue.primaryFixChapter !== null &&
                    batchRepairingChapterIds.includes(
                      issue.primaryFixChapter,
                    )
                  }
                />
              ))}
            </div>
          )}
        </main>

        {/* ── RIGHT: Repair progress panel ── */}
        <aside className="xl:block">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Wrench className="h-4 w-4" />
                修复进度
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isBatchRepairing ? (
                /* ── Active batch repair progress ── */
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {batchRepairMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                    )}
                    <span>
                      批量修复
                      {batchRepairMutation.isPending ? "进行中" : "已触发"}
                    </span>
                  </div>

                  {batchRepairMutation.isPending &&
                    batchRepairingChapterIds.length > 0 && (
                      <>
                        {/* Progress bar */}
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all duration-300"
                            style={{
                              width: `${(batchRepairCompletedCount / batchRepairingChapterIds.length) * 100}%`,
                            }}
                          />
                        </div>

                        {/* Chapter progress with issue labels */}
                        <div className="space-y-1.5 text-sm">
                          <p className="text-foreground">
                            正在修复第 {batchRepairCompletedCount + 1}/
                            {batchRepairingChapterIds.length} 章
                            {currentChapterIssueLabels.length > 0 && (
                              <span className="text-muted-foreground">
                                ，包含问题{" "}
                                {currentChapterIssueLabels.join(" ")}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            本章涉及{" "}
                            {(
                              batchRepairChapterIssueMap.get(
                                batchRepairingChapterIds[
                                  batchRepairCompletedCount
                                ],
                              ) ?? []
                            ).length}{" "}
                            个问题，每章约需 1-3 分钟
                          </p>
                        </div>

                        {/* All affected issues summary */}
                        {allAffectedIssueLabels.length > 0 && (
                          <div className="rounded-md bg-muted/60 p-2">
                            <p className="mb-1 text-xs font-medium text-muted-foreground">
                              全部受影响问题（{allAffectedIssueLabels.length}）
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {allAffectedIssueLabels.map((label) => (
                                <Badge
                                  key={label}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {label}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                  {!batchRepairMutation.isPending && (
                    <div className="text-xs text-muted-foreground">
                      修复为异步过程，问题状态会在完成后自动更新。
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setIsBatchRepairing(false)}
                  >
                    关闭面板
                  </Button>
                </div>
              ) : (
                /* ── Idle state ── */
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="rounded-full bg-muted p-3">
                    <Wrench className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    选择问题后点击修复开始
                  </p>
                  {acknowledgedIssues.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      当前有 {acknowledgedIssues.length} 个已确认问题待修复
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>

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
