import { useEffect, useMemo, useState } from "react";
import type { DirectorContinuationMode } from "@ai-novel/shared";
import type {
  DirectorBookAutomationAction,
  DirectorBookAutomationProjection,
} from "@ai-novel/shared";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { getDirectorBookAutomationProjection } from "@/api/novelDirector";
import { continueNovelWorkflow } from "@/api/novelWorkflow";
import { deleteNovel, downloadNovelExport, getNovelList } from "@/api/novel";
import { queryKeys } from "@/api/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/toast";
import {
  getDirectorCockpitActionHref,
  getDirectorCockpitContinuationMode,
  isDirectorCockpitContinuationAction,
} from "@/lib/directorCockpitActions";
import { resolveWorkflowContinuationFeedback } from "@/lib/novelWorkflowContinuation";
import { useTaskRecovery } from "@/components/layout/TaskRecoveryContext";
import NovelListItem, { NovelListCockpitDialog } from "./components/NovelListItem";

type StatusFilter = "all" | "draft" | "published";
type WritingModeFilter = "all" | "original" | "continuation";
const DIRECTOR_CREATE_LINK = "/novels/create?mode=director";
const MANUAL_CREATE_LINK = "/novels/create";
const NOVEL_LIST_PAGE_SIZE = 24;

function createDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function NovelList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [writingMode, setWritingMode] = useState<WritingModeFilter>("all");
  const [cockpitNovelId, setCockpitNovelId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { candidateCount: recoveryCandidateCount, openDialog: openRecoveryDialog } = useTaskRecovery();

  const novelListQuery = useQuery({
    queryKey: queryKeys.novels.list(page, NOVEL_LIST_PAGE_SIZE),
    queryFn: () => getNovelList({ page, limit: NOVEL_LIST_PAGE_SIZE }),
    staleTime: 30_000,
    refetchInterval: (query) => {
      const items = query.state.data?.data?.items ?? [];
      return items.some((novel) => {
        const task = novel.latestAutoDirectorTask;
        return task?.status === "queued" || task?.status === "running" || task?.status === "waiting_approval";
      })
        ? 4000
        : false;
    },
  });

  const cockpitProjectionQuery = useQuery({
    queryKey: cockpitNovelId
      ? queryKeys.novels.directorBookAutomation(cockpitNovelId)
      : ["novels", "director-book-automation", "idle"],
    queryFn: () => getDirectorBookAutomationProjection(cockpitNovelId ?? ""),
    enabled: Boolean(cockpitNovelId),
    staleTime: 10_000,
    refetchInterval: (query) => {
      return query.state.data?.data?.projection.displayState === "processing" ? 4000 : false;
    },
  });

  const deleteNovelMutation = useMutation({
    mutationFn: (id: string) => deleteNovel(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.novels.all });
      toast.success("小说已删除。");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "删除小说失败。");
    },
  });

  const downloadNovelMutation = useMutation({
    mutationFn: (input: { novelId: string; novelTitle: string }) => downloadNovelExport(
      input.novelId,
      "txt",
      "full",
      input.novelTitle,
    ),
    onSuccess: ({ blob, fileName }) => {
      createDownload(blob, fileName);
      toast.success("导出已开始。");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "导出小说失败。");
    },
  });

  const continueWorkflowMutation = useMutation({
    mutationFn: async (input: {
      taskId: string;
      mode?: DirectorContinuationMode;
    }) => continueNovelWorkflow(input.taskId, input.mode ? { continuationMode: input.mode } : undefined),
    onSuccess: async (response, input) => {
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: queryKeys.novels.all }),
        queryClient.invalidateQueries({ queryKey: ["tasks"] }),
      ];
      if (cockpitNovelId) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: queryKeys.novels.directorBookAutomation(cockpitNovelId) }),
        );
      }
      await Promise.all(invalidations);
      const feedback = resolveWorkflowContinuationFeedback(response.data, {
        mode: input.mode,
      });
      if (feedback.tone === "error") {
        toast.error(feedback.message);
        return;
      }
      toast.success(feedback.message);
    },
    onError: (error, input) => {
      toast.error(
        error instanceof Error
          ? error.message
          : input.mode === "auto_execute_range"
            ? "继续自动执行当前章节范围失败。"
            : "继续自动导演失败。",
      );
    },
  });

  const allNovels = novelListQuery.data?.data?.items ?? [];
  const totalPages = novelListQuery.data?.data?.totalPages ?? 1;
  const totalNovels = novelListQuery.data?.data?.total ?? 0;
  const selectedCockpitNovel = allNovels.find((item) => item.id === cockpitNovelId) ?? null;
  const cockpitProjection = cockpitProjectionQuery.data?.data?.projection ?? null;

  const novels = useMemo(() => {
    return allNovels.filter((item) => {
      if (status !== "all" && item.status !== status) {
        return false;
      }
      if (writingMode !== "all" && item.writingMode !== writingMode) {
        return false;
      }
      return true;
    });
  }, [allNovels, status, writingMode]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleDelete = (novelId: string, title: string) => {
    const confirmed = window.confirm(`确认删除《${title}》吗？该操作会直接删除当前小说。`);
    if (!confirmed) {
      return;
    }
    deleteNovelMutation.mutate(novelId);
  };

  const openNovelEditor = (novelId: string) => {
    navigate(`/novels/${novelId}/edit`);
  };

  const handleCockpitAction = (
    proj: DirectorBookAutomationProjection,
    action: DirectorBookAutomationAction,
  ) => {
    const taskId = action.commandPayload?.taskId ?? action.target.taskId ?? proj.latestTask?.id;
    if (taskId && isDirectorCockpitContinuationAction(action)) {
      continueWorkflowMutation.mutate({
        taskId,
        mode: getDirectorCockpitContinuationMode(action),
      });
      return;
    }
    setCockpitNovelId(null);
    navigate(getDirectorCockpitActionHref(proj, action));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button
              variant={status === "all" ? "default" : "secondary"}
              onClick={() => setStatus("all")}
            >
              全部
            </Button>
            <Button
              variant={status === "draft" ? "default" : "secondary"}
              onClick={() => setStatus("draft")}
            >
              草稿
            </Button>
            <Button
              variant={status === "published" ? "default" : "secondary"}
              onClick={() => setStatus("published")}
            >
              已发布
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={writingMode === "all" ? "default" : "secondary"}
              onClick={() => setWritingMode("all")}
            >
              创作类型: 全部
            </Button>
            <Button
              size="sm"
              variant={writingMode === "original" ? "default" : "secondary"}
              onClick={() => setWritingMode("original")}
            >
              原创
            </Button>
            <Button
              size="sm"
              variant={writingMode === "continuation" ? "default" : "secondary"}
              onClick={() => setWritingMode("continuation")}
            >
              续写
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            第 {page} / {totalPages} 页，共 {totalNovels} 本
          </Badge>
          {recoveryCandidateCount > 0 ? (
            <Button variant="outline" onClick={openRecoveryDialog}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              待恢复任务
              <Badge variant="secondary">{recoveryCandidateCount}</Badge>
            </Button>
          ) : null}
          <Button asChild>
            <Link to={DIRECTOR_CREATE_LINK}>AI 自动导演开书</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={MANUAL_CREATE_LINK}>手动创建小说</Link>
          </Button>
        </div>
      </div>

      {novelListQuery.isPending ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={`loading-${index}`} className="animate-pulse">
              <CardHeader>
                <div className="h-6 w-2/3 rounded bg-muted" />
                <div className="h-4 w-full rounded bg-muted" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 w-1/2 rounded bg-muted" />
                <div className="h-20 rounded bg-muted" />
                <div className="flex gap-2">
                  <div className="h-9 w-24 rounded bg-muted" />
                  <div className="h-9 w-20 rounded bg-muted" />
                  <div className="h-9 w-20 rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : novelListQuery.isError ? (
        <Card>
          <CardHeader>
            <CardTitle>加载小说列表失败</CardTitle>
            <CardDescription>当前无法读取项目列表，可以重试一次。</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => void novelListQuery.refetch()}>重新加载</Button>
          </CardContent>
        </Card>
      ) : novels.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{allNovels.length === 0 ? "暂无小说" : "暂无符合筛选条件的小说"}</CardTitle>
            <CardDescription>
              {allNovels.length === 0
                ? "第一次使用时，推荐直接点右上角“AI 自动导演开书”，让系统先帮你搭好方向与开写准备。"
                : "可以调整上方筛选条件，或直接创建新的小说项目。"}
            </CardDescription>
          </CardHeader>
          {allNovels.length === 0 ? (
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to={DIRECTOR_CREATE_LINK}>AI 自动导演开书</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={MANUAL_CREATE_LINK}>手动创建小说</Link>
              </Button>
            </CardContent>
          ) : null}
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            {novels.map((novel) => (
              <NovelListItem
                key={novel.id}
                novel={novel}
                isWorkflowPending={
                  continueWorkflowMutation.isPending
                  && continueWorkflowMutation.variables?.taskId === novel.latestAutoDirectorTask?.id
                }
                isDownloadPending={
                  downloadNovelMutation.isPending
                  && downloadNovelMutation.variables?.novelId === novel.id
                }
                isDeletePending={
                  deleteNovelMutation.isPending
                  && deleteNovelMutation.variables === novel.id
                }
                onCockpitClick={(novelId) => setCockpitNovelId(novelId)}
                onContinueWorkflow={(input) => {
                  continueWorkflowMutation.mutate({
                    taskId: input.taskId,
                    mode: input.mode as DirectorContinuationMode | undefined,
                  });
                }}
                onDownload={(input) => downloadNovelMutation.mutate(input)}
                onDelete={handleDelete}
                onOpenEditor={openNovelEditor}
              />
            ))}
          </div>
          {totalPages > 1 ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1 || novelListQuery.isFetching}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                上一页
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={page >= totalPages || novelListQuery.isFetching}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                下一页
              </Button>
            </div>
          ) : null}
        </>
      )}

      <NovelListCockpitDialog
        open={Boolean(cockpitNovelId)}
        onOpenChange={(open) => {
          if (!open) {
            setCockpitNovelId(null);
          }
        }}
        title={selectedCockpitNovel?.title ?? null}
        isPending={cockpitProjectionQuery.isPending}
        isError={cockpitProjectionQuery.isError}
        projection={cockpitProjection}
        isActionPending={continueWorkflowMutation.isPending}
        onAction={(projection, action) => {
          const taskId = action.commandPayload?.taskId ?? action.target.taskId ?? projection.latestTask?.id;
          if (taskId && isDirectorCockpitContinuationAction(action)) {
            continueWorkflowMutation.mutate({
              taskId,
              mode: getDirectorCockpitContinuationMode(action),
            });
            return;
          }
          setCockpitNovelId(null);
          navigate(getDirectorCockpitActionHref(projection, action));
        }}
        onOpenNovel={(projection) => {
          setCockpitNovelId(null);
          navigate(projection.focusNovel.href);
        }}
        onRetry={() => void cockpitProjectionQuery.refetch()}
      />
    </div>
  );
}
