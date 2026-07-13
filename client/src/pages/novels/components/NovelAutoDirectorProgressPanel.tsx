import type {
  NovelWorkflowMilestone,
} from "@ai-novel/shared";
import type {
  DirectorDashboardAction,
} from "@ai-novel/shared";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import {
  getDirectorTaskSnapshot,
} from "@/api/novelDirector";
import { queryKeys } from "@/api/queryKeys";
import DirectorRuntimeProjectionCard from "@/components/autoDirector/DirectorRuntimeProjectionCard";
import { Button } from "@/components/ui/button";
import AITakeoverContainer, { type AITakeoverMode } from "@/components/workflow/AITakeoverContainer";
import {
  isChapterTitleDiversitySummary,
  resolveChapterTitleWarning,
} from "@/lib/directorTaskNotice";
import { extractWorkflowActivityTags } from "@/lib/novelWorkflowActivityTags";
import { useDirectorChapterTitleRepair } from "@/hooks/useDirectorChapterTitleRepair";
import type {
  DirectorExecutionViewMode,
  NovelAutoDirectorProgressPanelProps,
} from "./novelAutoDirectorProgressPanel.types";
import {
  DIRECTOR_CANDIDATE_SETUP_STEP_KEYS,
  AUTO_DIRECTOR_PLACEHOLDER_TITLES,
  DIRECTOR_EXECUTION_STEPS,
  formatDate,
  formatTokenCount,
  resolveDirectorStyleSeed,
  formatCheckpoint,
  isCandidateSetupFlow,
  resolveDirectorStepStatuses,
  stepClasses,
  stepBadgeClasses,
  stepStatusLabel,
  mapDisplayStepStatus,
  mapDashboardModeToContainerMode,
  resolveAutoExecutionScopeLabel,
} from "./novelAutoDirectorProgressPanel.utils";

export default function NovelAutoDirectorProgressPanel({
  mode,
  task,
  taskId,
  titleHint,
  fallbackError,
  onBackgroundContinue,
  onConfirmAndContinue,
  isConfirmingAndContinuing = false,
  onOpenTaskCenter,
  onRetry,
  onRetryWithResume,
  retryPending = false,
}: NovelAutoDirectorProgressPanelProps) {
  const taskChapterTitleWarning = resolveChapterTitleWarning(task);
  const chapterTitleRepairMutation = useDirectorChapterTitleRepair();
  const runtimeTaskId = task?.id ?? taskId;
  const snapshotQuery = useQuery({
    queryKey: queryKeys.tasks.directorTaskSnapshot(runtimeTaskId || "none"),
    queryFn: () => getDirectorTaskSnapshot(runtimeTaskId),
    enabled: Boolean(runtimeTaskId),
    retry: false,
    placeholderData: (previousData) => previousData,
    refetchInterval: () => (
      task && (task.status === "queued" || task.status === "running" || task.status === "waiting_approval") ? 4000 : false
    ),
  });
  const snapshot = snapshotQuery.data?.data?.snapshot ?? null;
  const dashboardView = snapshot?.dashboardView ?? null;
  const displayState = snapshot?.displayState ?? null;
  const runtimeProjection = snapshot?.projection ?? null;
  const staleActionProjection = Boolean(
    dashboardView?.mode === "running"
    && (
      runtimeProjection?.requiresUserAction
      || runtimeProjection?.status === "blocked"
      || runtimeProjection?.status === "waiting_approval"
    ),
  );
  const runtimeProjectionForDisplay = dashboardView?.mode === "recovering" || staleActionProjection ? null : runtimeProjection;
  const historyEvents = snapshot?.recentEvents ?? [];
  const displayProgress = dashboardView?.progressPercent ?? displayState?.progressPercent ?? task?.progress ?? null;
  const fallbackChapterTitleWarning = !taskChapterTitleWarning && isChapterTitleDiversitySummary(fallbackError)
    ? {
      summary: fallbackError?.trim() ?? "",
      route: null,
      label: "快速修复章节标题",
    }
    : null;
  const rawChapterTitleWarning = taskChapterTitleWarning ?? fallbackChapterTitleWarning;
  const chapterTitleWarning = dashboardView?.mode === "running" || dashboardView?.mode === "queued"
    ? null
    : rawChapterTitleWarning;
  const visualMode: DirectorExecutionViewMode = mode === "execution_failed" && !chapterTitleWarning && dashboardView?.mode !== "running"
    ? "execution_failed"
    : "execution_progress";
  const currentAction = dashboardView?.currentAction
    || displayState?.currentAction
    || runtimeProjectionForDisplay?.currentLabel?.trim()
    || task?.currentItemLabel?.trim()
    || (visualMode === "execution_failed"
      ? "导演任务执行中断"
      : (chapterTitleWarning ? "章节列表已生成，等待修复标题结构" : "正在准备导演任务"));
  const activityTags = extractWorkflowActivityTags(displayState?.currentFactStepLabel || task?.currentItemLabel);
  const workflowTitle = task?.title?.trim() || "";
  const hintedTitle = titleHint?.trim() || "";
  const taskTitle = (
    hintedTitle && (!workflowTitle || AUTO_DIRECTOR_PLACEHOLDER_TITLES.has(workflowTitle))
      ? hintedTitle
      : workflowTitle || hintedTitle || "新小说项目"
  );
  const milestones = Array.isArray(task?.meta.milestones)
    ? task.meta.milestones as NovelWorkflowMilestone[]
    : [];
  const candidateSetupFlow = isCandidateSetupFlow(task);
  const displaySteps = dashboardView?.steps ?? displayState?.steps ?? [];
  const stepDefinitions = candidateSetupFlow
    ? DIRECTOR_EXECUTION_STEPS
    : displaySteps.map((step) => ({ key: step.key, label: step.label }));
  const steps = candidateSetupFlow
    ? resolveDirectorStepStatuses(task, visualMode, stepDefinitions)
    : displaySteps.map((step) => mapDisplayStepStatus(step.status));
  const failureMessage = task?.lastError?.trim() || fallbackError?.trim() || "导演任务执行失败，但没有记录明确错误。";
  const tokenUsage = task?.tokenUsage ?? null;
  const styleSeed = resolveDirectorStyleSeed(task);
  const containerMode: AITakeoverMode = visualMode === "execution_failed"
    ? "failed"
    : !task
      ? "loading"
      : chapterTitleWarning
        ? "waiting"
        : mapDashboardModeToContainerMode(dashboardView?.mode ?? null);
  const description = candidateSetupFlow
    ? (
      visualMode === "execution_failed"
        ? "候选方向生成链已中断，可以先查看执行详情，再决定是否重试。"
        : "系统会先整理项目设定、对齐书级 framing，再生成两套书级方案和对应标题组。"
    )
    : (
      dashboardView?.description
      || displayState?.description
      || (visualMode === "execution_failed"
        ? "任务已停在最近一步，可以先查看执行详情，再决定是否恢复。"
        : chapterTitleWarning
          ? "章节列表已经保留，这是一条可直接处理的结构提醒。你可以快速修复标题，再决定是否继续后续导演流程。"
          : task?.status === "waiting_approval"
            ? "当前导演流程已经停在审核点，你可以先检查产物，再决定是否继续自动推进。"
            : "可离开当前页面，任务会继续运行；回来后可在 AI 驾驶舱查看进度。")
    );
  const resolveDashboardAction = (dashboardAction: DirectorDashboardAction) => {
    if (dashboardAction.type === "confirm_and_continue" && onConfirmAndContinue) {
      return {
        label: isConfirmingAndContinuing ? "继续中..." : dashboardAction.label,
        onClick: onConfirmAndContinue,
        variant: "default" as const,
        disabled: isConfirmingAndContinuing,
      };
    }
    if (dashboardAction.type === "background_continue") {
      return {
        label: dashboardAction.label,
        onClick: onBackgroundContinue,
        variant: "outline" as const,
      };
    }
    if (dashboardAction.type === "open_task_center") {
      return {
        label: dashboardAction.label,
        onClick: onOpenTaskCenter,
        variant: dashboardAction.emphasis === "primary" ? ("default" as const) : ("outline" as const),
      };
    }
    if (dashboardAction.type === "retry") {
      return {
        label: retryPending ? "重试中..." : dashboardAction.label,
        onClick: onRetry ?? onOpenTaskCenter,
        variant: dashboardAction.emphasis === "primary" ? ("default" as const) : ("outline" as const),
        disabled: retryPending,
      };
    }
    if (dashboardAction.type === "resume_from_checkpoint") {
      return {
        label: retryPending ? "恢复中..." : dashboardAction.label,
        onClick: onRetryWithResume ?? onRetry ?? onOpenTaskCenter,
        variant: "outline" as const,
        disabled: retryPending,
      };
    }
    return null;
  };
  const dashboardActions = dashboardView
    ? [
      dashboardView.primaryAction,
      ...dashboardView.secondaryActions,
    ].filter((item): item is DirectorDashboardAction => Boolean(item))
      .map(resolveDashboardAction)
      .filter((item): item is NonNullable<ReturnType<typeof resolveDashboardAction>> => Boolean(item))
    : [];
  const actions = chapterTitleWarning
    ? [{
      label: "查看执行详情",
      onClick: onOpenTaskCenter,
      variant: "default" as const,
    }]
    : (dashboardActions.length > 0
      ? dashboardActions
      : [{
        label: "查看执行详情",
        onClick: onOpenTaskCenter,
        variant: "default" as const,
      }]);

  return (
    <div className="space-y-4">
      <AITakeoverContainer
        mode={containerMode}
        title={visualMode === "execution_failed"
          ? (candidateSetupFlow ? "候选方案生成失败" : "导演执行失败")
          : dashboardView?.mode === "recovering"
            ? `《${taskTitle}》等待恢复`
            : candidateSetupFlow
              ? "正在生成导演候选方案"
              : `《${taskTitle}》正在自动导演`}
        description={description}
        progress={displayProgress}
        currentAction={currentAction}
        checkpointLabel={displayState?.checkpointLabel || formatCheckpoint(task?.checkpointType, task)}
        taskId={task?.id || taskId}
        actions={actions}
      >
        <div className={`grid gap-3 ${candidateSetupFlow ? "md:grid-cols-4" : "md:grid-cols-7"}`}>
          {(candidateSetupFlow
            ? stepDefinitions
            : displaySteps.map((step) => ({ key: step.key, label: step.label }))).map((step, index) => (
            <div key={step.key} className={`rounded-xl border p-3 ${stepClasses(steps[index] ?? "pending")}`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${stepBadgeClasses(steps[index] ?? "pending")}`}>
                  {index + 1}
                </span>
                <span className="text-[11px] text-muted-foreground">{stepStatusLabel(steps[index] ?? "pending")}</span>
              </div>
              <div className="mt-3 text-sm font-medium text-foreground">{step.label}</div>
            </div>
          ))}
        </div>

        {activityTags.length > 0 ? (
          <div className="mt-4 rounded-xl border bg-background/80 p-3">
            <div className="text-xs font-medium text-muted-foreground">{"后台附属分析"}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {activityTags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          </div>
        ) : null}

        {displayState?.pipelineMode === "pipeline" ? (
          <div className="mt-4 rounded-xl border border-sky-300/60 bg-sky-50/40 p-3 dark:border-sky-700/50 dark:bg-sky-950/15">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-foreground">流水线执行模式</div>
              <Badge variant="secondary">交错执行中</Badge>
            </div>
            {displayState.pipelineState ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/70 bg-background/80 p-3">
                  <div className="text-xs text-muted-foreground">细化进度</div>
                  <div className="mt-1 text-sm font-medium text-foreground">
                    {displayState.pipelineState.refinementProgress.completed} / {displayState.pipelineState.refinementProgress.total}
                  </div>
                  {displayState.pipelineState.refinementProgress.currentChapterId ? (
                    <div className="mt-1 text-[11px] text-muted-foreground">当前章节 {displayState.pipelineState.refinementProgress.currentChapterId.slice(0, 8)}</div>
                  ) : null}
                </div>
                <div className="rounded-lg border border-border/70 bg-background/80 p-3">
                  <div className="text-xs text-muted-foreground">写作进度</div>
                  <div className="mt-1 text-sm font-medium text-foreground">
                    {displayState.pipelineState.writingProgress.completed} / {displayState.pipelineState.writingProgress.total}
                  </div>
                  {displayState.pipelineState.writingProgress.currentChapterId ? (
                    <div className="mt-1 text-[11px] text-muted-foreground">当前章节 {displayState.pipelineState.writingProgress.currentChapterId.slice(0, 8)}</div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-2 text-xs text-muted-foreground">等待流水线状态更新...</div>
            )}
            {displayState.pipelineState?.blockedChapterId ? (
              <div className="mt-2 rounded-lg border border-amber-300/40 bg-amber-50/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-200">
                当前阻塞：{displayState.pipelineState.blockingReason === "quality_review" ? "质量审核" : "等待人工确认"}
              </div>
            ) : null}
          </div>
        ) : null}

        <DirectorRuntimeProjectionCard
          projection={runtimeProjectionForDisplay}
          className="mt-4"
        />

        <div className="mt-4 rounded-xl border bg-background/80 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-foreground">{"全部进展"}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {historyEvents.length > 0 ? `显示 ${historyEvents.length} 条最近进展` : "正在读取进展记录"}
              </div>
            </div>
          </div>

          {snapshotQuery.isLoading ? (
            <div className="mt-3 rounded-lg border bg-muted/15 px-3 py-2 text-sm text-muted-foreground">
              {"正在读取进展记录。"}
            </div>
          ) : historyEvents.length > 0 ? (
            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
              {historyEvents.map((event) => (
                <div key={event.eventId} className="rounded-lg border bg-muted/15 p-3 text-sm">
                  <div className="font-medium text-foreground">{event.summary}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{"记录时间："}{formatDate(event.occurredAt)}</span>
                    {event.nodeKey ? <span>{"步骤："}{event.nodeKey}</span> : null}
                    {event.artifactType ? <span>{"产物："}{event.artifactType}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 rounded-lg border bg-muted/15 px-3 py-2 text-sm text-muted-foreground">
              {"任务运行后会在这里写入进展记录。"}
            </div>
          )}
        </div>

        {styleSeed ? (
          <div className="mt-4 rounded-xl border bg-background/80 p-4">
            <div className="text-sm font-medium text-foreground">当前命中写法</div>
            <div className="mt-2 text-sm text-foreground">{styleSeed.title}</div>
            {styleSeed.summaryLines.length > 0 ? (
              <div className="mt-3 space-y-2">
                <div className="text-xs font-medium text-muted-foreground">本阶段仅生效的写法摘要</div>
                {styleSeed.summaryLines.map((line) => (
                  <div key={line} className="rounded-lg border bg-muted/20 px-3 py-2 text-xs leading-6 text-muted-foreground">
                    {line}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {tokenUsage ? (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl border bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">累计调用</div>
              <div className="mt-1 text-sm font-medium text-foreground">{formatTokenCount(tokenUsage.llmCallCount)}</div>
            </div>
            <div className="rounded-xl border bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">输入 Tokens</div>
              <div className="mt-1 text-sm font-medium text-foreground">{formatTokenCount(tokenUsage.promptTokens)}</div>
            </div>
            <div className="rounded-xl border bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">输出 Tokens</div>
              <div className="mt-1 text-sm font-medium text-foreground">{formatTokenCount(tokenUsage.completionTokens)}</div>
            </div>
            <div className="rounded-xl border bg-background/80 p-3">
              <div className="text-xs text-muted-foreground">累计总 Tokens</div>
              <div className="mt-1 text-sm font-medium text-foreground">{formatTokenCount(tokenUsage.totalTokens)}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">最近记录：{formatDate(tokenUsage.lastRecordedAt)}</div>
            </div>
          </div>
        ) : null}

        {chapterTitleWarning ? (
          <div className="mt-4 rounded-xl border border-amber-300/60 bg-amber-50/80 p-4 text-sm text-amber-950">
            <div className="font-medium">当前提醒</div>
            <div className="mt-1">{chapterTitleWarning.summary}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {task && chapterTitleWarning ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    chapterTitleRepairMutation.startRepair(task);
                  }}
                  disabled={chapterTitleRepairMutation.isPending}
                >
                  {chapterTitleRepairMutation.isPending && chapterTitleRepairMutation.pendingTaskId === task.id
                    ? "AI 修复中..."
                    : chapterTitleWarning.label}
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenTaskCenter}
              >
                查看执行详情
              </Button>
            </div>
          </div>
        ) : visualMode === "execution_failed" ? (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <div className="font-medium">失败摘要</div>
            <div className="mt-1">{failureMessage}</div>
            {task?.recoveryHint ? (
              <div className="mt-2 text-xs text-destructive/80">恢复建议：{task.recoveryHint}</div>
            ) : null}
          </div>
        ) : null}
      </AITakeoverContainer>

      <div className="rounded-xl border bg-background/70 p-4">
        <div className="text-sm font-medium text-foreground">里程碑历史</div>
        {milestones.length > 0 ? (
          <div className="mt-3 space-y-3">
            {milestones
              .slice()
              .reverse()
              .map((item) => (
                <div key={`${item.checkpointType}:${item.createdAt}`} className="rounded-lg border bg-muted/15 p-3">
                  <div className="font-medium text-foreground">{formatCheckpoint(item.checkpointType, task)}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{item.summary}</div>
                  <div className="mt-1 text-xs text-muted-foreground">记录时间：{formatDate(item.createdAt)}</div>
                </div>
              ))}
          </div>
        ) : (
          <div className="mt-3 text-sm text-muted-foreground">
            任务已创建，正在等待第一个稳定里程碑写入。
          </div>
        )}
      </div>
    </div>
  );
}
