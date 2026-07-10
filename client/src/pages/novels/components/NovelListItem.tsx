import type { KeyboardEvent, MouseEvent } from "react";
import type { ProjectProgressStatus } from "@ai-novel/shared";
import type {
  DirectorBookAutomationAction,
  DirectorBookAutomationProjection,
} from "@ai-novel/shared";
import { Link } from "react-router-dom";
import { BookOpen, Gauge } from "lucide-react";
import type { NovelListItem as NovelListItemData } from "@/api/novel/shared";
import AICockpit from "@/components/autoDirector/AICockpit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AppDialogContent,
  Dialog,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  canContinueDirector,
  canContinueChapterBatchAutoExecution,
  canEnterChapterExecution,
  getCandidateSelectionLink,
  getWorkflowBadge,
  getWorkflowDescription,
  isWorkflowRunningInBackground,
  requiresCandidateSelection,
} from "@/lib/novelWorkflowTaskUi";
import NovelWorkflowRunningIndicator from "./NovelWorkflowRunningIndicator";

function formatProgressStatus(status?: ProjectProgressStatus | null): string {
  if (status === "completed") {
    return "已完成";
  }
  if (status === "in_progress") {
    return "进行中";
  }
  if (status === "rework") {
    return "待返工";
  }
  if (status === "blocked") {
    return "受阻";
  }
  return "未开始";
}

function formatTokenCount(value?: number | null): string {
  const normalized = typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.round(value))
    : 0;
  return new Intl.NumberFormat("zh-CN").format(normalized);
}

interface NovelListItemProps {
  novel: NovelListItemData;
  isWorkflowPending: boolean;
  isDownloadPending: boolean;
  isDeletePending: boolean;
  onCockpitClick: (novelId: string) => void;
  onContinueWorkflow: (input: { taskId: string; mode?: string }) => void;
  onDownload: (input: { novelId: string; novelTitle: string }) => void;
  onDelete: (novelId: string, title: string) => void;
  onOpenEditor: (novelId: string) => void;
}

function StopCardClick(e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) {
  e.stopPropagation();
}

export default function NovelListItem(props: NovelListItemProps) {
  const {
    novel,
    isWorkflowPending,
    isDownloadPending,
    isDeletePending,
    onCockpitClick,
    onContinueWorkflow,
    onDownload,
    onDelete,
    onOpenEditor,
  } = props;

  const workflowTask = novel.latestAutoDirectorTask ?? null;
  const workflowCurrentAction = workflowTask?.currentItemLabel?.trim() || "";
  const workflowBadge = getWorkflowBadge(workflowTask);
  const workflowDescription = getWorkflowDescription(workflowTask);
  const isWorkflowRunning = isWorkflowRunningInBackground(workflowTask);

  return (
    <Card
      role="link"
      tabIndex={0}
      className="cursor-pointer transition hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
      onClick={() => onOpenEditor(novel.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenEditor(novel.id);
        }
      }}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="line-clamp-1 text-lg transition hover:text-primary">
            {novel.title}
          </CardTitle>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Badge variant={novel.status === "published" ? "default" : "secondary"}>
              {novel.status === "published" ? "已发布" : "草稿"}
            </Badge>
            {novel.writingMode === "continuation" ? (
              <Badge variant="outline">续写</Badge>
            ) : (
              <Badge variant="outline">原创</Badge>
            )}
          </div>
        </div>
        <CardDescription className="line-clamp-2">
          {novel.description || "暂无简介"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground">
          章节数：{novel._count.chapters}，角色数：{novel._count.characters}，累计 Token：{formatTokenCount(
            novel.tokenUsage?.totalTokens,
          )}
        </div>

        {workflowTask ? (
          <div
            className={cn(
              "rounded-xl border p-3 transition-colors",
              isWorkflowRunning
                ? "border-primary/20 bg-primary/[0.04] shadow-sm"
                : "bg-muted/20",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              {workflowBadge ? (
                <Badge variant={workflowBadge.variant}>{workflowBadge.label}</Badge>
              ) : null}
              <Badge variant="outline">进度 {Math.round(workflowTask.progress * 100)}%</Badge>
              {isWorkflowRunning ? (
                <Badge variant="outline">后台运行中</Badge>
              ) : null}
            </div>
            {workflowDescription ? (
              <div className="mt-2 text-sm text-muted-foreground">{workflowDescription}</div>
            ) : null}
            {isWorkflowRunning ? (
              <NovelWorkflowRunningIndicator
                className="mt-3"
                progress={workflowTask.progress}
                label={workflowCurrentAction || "AI 正在后台持续推进"}
              />
            ) : null}
            <div className="mt-2 text-xs text-muted-foreground">
              当前阶段：{workflowTask.currentStage ?? "自动导演"}{workflowCurrentAction ? ` · ${workflowCurrentAction}` : ""}
            </div>
            {workflowTask.lastHealthyStage ? (
              <div className="mt-1 text-xs text-muted-foreground">
                最近健康阶段：{workflowTask.lastHealthyStage}
              </div>
            ) : null}
            {workflowTask.resumeAction ? (
              <div className="mt-1 text-xs text-muted-foreground">
                建议继续：{workflowTask.resumeAction}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-muted/10 p-3 text-xs text-muted-foreground">
            当前未检测到自动导演任务，列表按小说基础资产展示。
          </div>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>项目：{formatProgressStatus(novel.projectStatus)}</span>
          <span>主线：{formatProgressStatus(novel.storylineStatus)}</span>
          <span>大纲：{formatProgressStatus(novel.outlineStatus)}</span>
          <span>资源：{novel.resourceReadyScore ?? 0}/100</span>
        </div>

        {novel.world ? (
          <div className="text-xs text-muted-foreground">
            参考世界样本：{novel.world.name}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              StopCardClick(event);
              onCockpitClick(novel.id);
            }}
          >
            <Gauge className="h-4 w-4" aria-hidden="true" />
            AI 驾驶舱
          </Button>

          {canContinueChapterBatchAutoExecution(workflowTask) ? (
            <Button
              size="sm"
              onClick={(event) => {
                StopCardClick(event);
                if (!workflowTask) {
                  return;
                }
                onContinueWorkflow({
                  taskId: workflowTask.id,
                  mode: "auto_execute_range",
                });
              }}
              disabled={isWorkflowPending}
            >
              {isWorkflowPending ? "继续执行中..." : (workflowTask?.resumeAction ?? `继续自动执行${workflowTask?.executionScopeLabel ?? "当前章节范围"}`)}
            </Button>
          ) : canContinueDirector(workflowTask) ? (
            <Button
              size="sm"
              onClick={(event) => {
                StopCardClick(event);
                if (!workflowTask) {
                  return;
                }
                onContinueWorkflow({
                  taskId: workflowTask.id,
                });
              }}
              disabled={isWorkflowPending}
            >
              {isWorkflowPending ? "继续中..." : (workflowTask?.resumeAction ?? "继续导演")}
            </Button>
          ) : requiresCandidateSelection(workflowTask) ? (
            <Button asChild size="sm">
              <Link to={getCandidateSelectionLink(workflowTask!.id)} onClick={StopCardClick}>
                {workflowTask!.resumeAction ?? "继续确认书级方向"}
              </Link>
            </Button>
          ) : canEnterChapterExecution(workflowTask) ? (
            <Button asChild size="sm">
              <Link to={`/novels/${novel.id}/edit`} onClick={StopCardClick}>进入章节执行</Link>
            </Button>
          ) : workflowTask ? (
            <Button asChild size="sm">
              <Link to={`/novels/${novel.id}/edit?directorTaskId=${workflowTask.id}`} onClick={StopCardClick}>查看推进状态</Link>
            </Button>
          ) : null}

          {workflowTask ? (
            <Button asChild size="sm" variant="outline">
              <Link to={`/novels/${novel.id}/edit?directorTaskId=${workflowTask.id}&taskPanel=1`} onClick={StopCardClick}>执行详情</Link>
            </Button>
          ) : null}

          <Button asChild size="sm" variant="outline">
            <Link to={`/novels/${novel.id}/preview`} onClick={StopCardClick}>
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              预览
            </Link>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              StopCardClick(event);
              onDownload({ novelId: novel.id, novelTitle: novel.title });
            }}
            disabled={isDownloadPending}
          >
            {isDownloadPending ? "导出中..." : "导出"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={(event) => {
              StopCardClick(event);
              onDelete(novel.id, novel.title);
            }}
            disabled={isDeletePending}
          >
            {isDeletePending ? "删除中..." : "删除"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface NovelListCockpitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string | null;
  isPending: boolean;
  isError: boolean;
  projection: DirectorBookAutomationProjection | null;
  isActionPending: boolean;
  onAction: (projection: DirectorBookAutomationProjection, action: DirectorBookAutomationAction) => void;
  onOpenNovel: (projection: DirectorBookAutomationProjection) => void;
  onRetry: () => void;
}

export function NovelListCockpitDialog(props: NovelListCockpitDialogProps) {
  const {
    open,
    onOpenChange,
    title,
    isPending,
    isError,
    projection,
    isActionPending,
    onAction,
    onOpenNovel,
    onRetry,
  } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent
        className="max-w-2xl"
        title="AI 驾驶舱"
        description={
          title
            ? `查看《${title}》的 AI 推进状态和下一步动作。`
            : "查看这本书的 AI 推进状态和下一步动作。"
        }
      >
        {isPending ? (
          <div className="rounded-lg border p-3 text-sm text-muted-foreground">
            读取这本书的 AI 状态...
          </div>
        ) : isError ? (
          <div className="rounded-lg border p-3">
            <div className="text-sm text-muted-foreground">无法读取这本书的 AI 状态，请稍后重试。</div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={onRetry}
            >
              重新读取
            </Button>
          </div>
        ) : projection ? (
          <AICockpit
            projection={projection}
            mode="focusedNovel"
            isActionPending={isActionPending}
            onAction={onAction}
            onOpenNovel={onOpenNovel}
          />
        ) : (
          <AICockpit fallbackSummary="这本书没有需要处理的 AI 自动推进任务。" />
        )}
      </AppDialogContent>
    </Dialog>
  );
}
