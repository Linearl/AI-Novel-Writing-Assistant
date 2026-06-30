import type {
  DirectorSessionState,
} from "@ai-novel/shared/types/novelDirector";
import type {
  AutoDirectorAction,
} from "@ai-novel/shared/types/autoDirectorFollowUp";
import type {
  DirectorBookAutomationProjection,
  DirectorBookAutomationAction,
  DirectorTaskSnapshot,
} from "@ai-novel/shared/types/directorRuntime";
import type { UnifiedTaskDetail } from "@ai-novel/shared/types/task";
import { toast } from "@/components/ui/toast";
import { useStructuredOutlineWorkspaceStore } from "./stores/useStructuredOutlineWorkspaceStore";
import {
  buildDisplayAutoDirectorTask,
  canArchiveCompletedAutoDirectorTask,
  resolveAutomationActionText,
  resolveTakeoverModeFromAutomation,
} from "./novelEditAutomationStatus";
import {
  buildContinueAutoExecutionActionLabel,
  buildSkipQualityRepairActionLabel,
  buildTakeoverDescription,
  buildTakeoverTitle,
  formatTakeoverCheckpoint,
  resolveAutoExecutionScopeLabel,
} from "./novelEditTakeover.shared";
import { canCancelDirectorTask, getCandidateSelectionLink } from "@/lib/novelWorkflowTaskUi";
import { tabFromScope } from "./novelWorkspaceNavigation";
import {
  resolveDirectorConsistencyIssue,
  mapDashboardModeToTakeoverMode,
} from "./novelEditHelpers";
import type { NovelEditTakeoverState, NovelTaskDrawerState } from "./components/NovelEditView.types";
import { isDirectorCockpitContinuationAction, getDirectorCockpitContinuationMode, getDirectorCockpitActionHref } from "@/lib/directorCockpitActions";
import { resolveInternalNavigationTarget } from "@/lib/internalNavigation";

/** Minimal mutation interface for takeover builders */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MutationMutate = (...args: any[]) => void;
interface MutationLike {
  isPending: boolean;
  mutate: MutationMutate;
}
interface ChapterTitleRepairMutation {
  isPending: boolean;
  pendingTaskId?: string;
  startRepair: (task: UnifiedTaskDetail) => void;
}
interface ChapterTitleWarning {
  label: string;
  volumeId?: string | null;
}

export interface BuildTakeoverParams {
  displayAutoDirectorTask: UnifiedTaskDetail | null;
  activeAutoDirectorTask: UnifiedTaskDetail | null;
  activeDirectorSnapshot: DirectorTaskSnapshot | null;
  activeDirectorSession: DirectorSessionState | null;
  bookAutomationProjection: DirectorBookAutomationProjection | null;
  characters: Array<{ id: string; role: string }>;
  chapters: Array<{ id: string; order: number }>;
  novelTitle: string;
  activeTab: string;
  activeChapterTitleWarning: ChapterTitleWarning | null;
  hasUnsavedVolumeDraft: boolean;
  chapterTitleRepairMutation: ChapterTitleRepairMutation;
  continueAutoDirectorMutation: MutationLike;
  continueAutoExecutionMutation: MutationLike;
  cancelAutoDirectorMutation: MutationLike;
  archiveCompletedAutoDirectorMutation: MutationLike;
  isDirectorExitActionExpanded: boolean;
  setIsDirectorExitActionExpanded: (expanded: boolean) => void;
  setIsTaskDrawerOpen: (open: boolean) => void;
  setActiveTab: (tab: string) => void;
  setSelectedChapterId: (id: string) => void;
  dismissTakeover: () => void;
  openCandidateSelection: (taskId?: string) => void;
  openChapterExecution: (task?: UnifiedTaskDetail | null) => void;
  openQualityRepair: (task?: UnifiedTaskDetail | null) => void;
  reviewTab: string | null;
  actionTargetDirectorTaskId: string;
}

export function buildTakeoverState(params: BuildTakeoverParams): NovelEditTakeoverState | null {
  const {
    displayAutoDirectorTask,
    activeAutoDirectorTask,
    activeDirectorSnapshot,
    activeDirectorSession,
    bookAutomationProjection,
    characters,
    chapters,
    novelTitle,
    activeTab,
    activeChapterTitleWarning,
    hasUnsavedVolumeDraft,
    chapterTitleRepairMutation,
    continueAutoDirectorMutation,
    continueAutoExecutionMutation,
    cancelAutoDirectorMutation,
    archiveCompletedAutoDirectorMutation,
    isDirectorExitActionExpanded,
    setIsDirectorExitActionExpanded,
    setIsTaskDrawerOpen,
    setActiveTab,
    setSelectedChapterId,
    dismissTakeover,
    openCandidateSelection,
    openChapterExecution,
    openQualityRepair,
    reviewTab,
    actionTargetDirectorTaskId,
  } = params;

  const task = displayAutoDirectorTask;
  if (!task) {
    return null;
  }
  const consistencyIssue = resolveDirectorConsistencyIssue({
    checkpointType: task.checkpointType,
    characterCount: characters.length,
    chapterCount: chapters.length,
  });
  const dashboardView = activeDirectorSnapshot?.dashboardView ?? null;
  const mode = mapDashboardModeToTakeoverMode(dashboardView?.mode)
    ?? resolveTakeoverModeFromAutomation({
    task,
    projection: bookAutomationProjection,
  });
  const automationActionText = resolveAutomationActionText({
    task,
    projection: bookAutomationProjection,
  });
  const title = novelTitle;
  const scope = activeDirectorSession?.reviewScope ?? null;
  const autoExecutionScopeLabel = resolveAutoExecutionScopeLabel(task);
  const actions: NonNullable<NovelEditTakeoverState["actions"]> = [];

  if (activeChapterTitleWarning) {
    actions.push({
      label: chapterTitleRepairMutation.isPending && chapterTitleRepairMutation.pendingTaskId === task.id
        ? "AI 修复中..."
        : activeChapterTitleWarning.label,
      onClick: () => {
        if (hasUnsavedVolumeDraft) {
          toast.error("当前拆章工作区还有未保存修改，请先保存工作区，再发起 AI 修复标题。");
          return;
        }
        chapterTitleRepairMutation.startRepair(task);
      },
      variant: mode === "failed" ? "default" : "outline",
      disabled: chapterTitleRepairMutation.isPending,
    });
  }

  const reviewTabValue = tabFromScope(scope);
  if (
    mode === "waiting"
    && task.checkpointType === "candidate_selection_required"
  ) {
    actions.push({
      label: "去确认书级方向",
      onClick: () => openCandidateSelection(task.id),
      variant: "default",
    });
  } else if (
    (mode === "waiting" || mode === "action_required")
    && reviewTabValue
    && reviewTabValue !== activeTab
    && task.checkpointType !== "chapter_batch_ready"
  ) {
    actions.push({
      label: "去当前审核阶段",
      onClick: () => setActiveTab(reviewTabValue),
      variant: "outline",
    });
  }
  if (task.pendingManualRecovery) {
    actions.push({
      label: continueAutoDirectorMutation.isPending ? "继续中..." : "继续自动导演",
      onClick: () => continueAutoDirectorMutation.mutate({ directorTaskId: task.id }),
      variant: "default",
      disabled: continueAutoDirectorMutation.isPending,
    });
  } else if (mode === "waiting" && task.checkpointType === "chapter_batch_ready") {
    actions.push({
      label: buildContinueAutoExecutionActionLabel(autoExecutionScopeLabel, continueAutoExecutionMutation.isPending),
      onClick: () => continueAutoExecutionMutation.mutate({ directorTaskId: task.id }),
      variant: "default",
      disabled: continueAutoExecutionMutation.isPending,
    });
    actions.push({
      label: "进入章节执行",
      onClick: () => {
        if (task.resumeTarget?.chapterId) {
          setSelectedChapterId(task.resumeTarget.chapterId);
        }
        setActiveTab("chapter");
      },
      variant: "outline",
    });
  } else if (mode === "waiting" && task.checkpointType === "workflow_completed") {
    actions.push({
      label: "进入章节执行",
      onClick: () => openChapterExecution(task),
      variant: "default",
    });
  } else if (mode === "action_required" && task.checkpointType === "replan_required") {
    actions.push({
      label: buildSkipQualityRepairActionLabel(autoExecutionScopeLabel, continueAutoExecutionMutation.isPending),
      onClick: () => continueAutoExecutionMutation.mutate({
        directorTaskId: task.id,
        continuationMode: "skip_quality_repair",
      }),
      variant: "default",
      disabled: continueAutoExecutionMutation.isPending,
    });
    actions.push({
      label: "打开质量修复",
      onClick: () => openQualityRepair(task),
      variant: "outline",
    });
  } else if (mode === "waiting") {
    actions.push({
      label: continueAutoDirectorMutation.isPending ? "继续中..." : "继续自动导演",
      onClick: () => continueAutoDirectorMutation.mutate({ directorTaskId: task.id }),
      variant: "default",
      disabled: continueAutoDirectorMutation.isPending,
    });
  }
  if (mode === "failed" && task.checkpointType === "chapter_batch_ready") {
    actions.push({
      label: buildContinueAutoExecutionActionLabel(autoExecutionScopeLabel, continueAutoExecutionMutation.isPending),
      onClick: () => continueAutoExecutionMutation.mutate({ directorTaskId: task.id }),
      variant: "default",
      disabled: continueAutoExecutionMutation.isPending,
    });
    actions.push({
      label: "打开质量修复",
      onClick: () => openQualityRepair(task),
      variant: "outline",
    });
  }
  if (consistencyIssue) {
    actions.push({
      label: continueAutoDirectorMutation.isPending ? "修复中..." : "补齐导演产物",
      onClick: () => continueAutoDirectorMutation.mutate({ directorTaskId: task.id }),
      variant: "default",
      disabled: continueAutoDirectorMutation.isPending,
    });
    if (consistencyIssue === "missing_characters") {
      actions.push({
        label: "去角色准备",
        onClick: () => setActiveTab("character"),
        variant: "outline",
      });
    }
  } else if (task.checkpointType === "chapter_batch_ready" && mode !== "waiting") {
    actions.push({
      label: "进入章节执行",
      onClick: () => {
        if (task.resumeTarget?.chapterId) {
          setSelectedChapterId(task.resumeTarget.chapterId);
        }
        setActiveTab("chapter");
      },
      variant: mode === "running" ? "outline" : "default",
    });
  }
  const canCancelTask = canCancelDirectorTask(task);
  if (canCancelTask) {
    if (task.status === "failed") {
      actions.push({
        label: cancelAutoDirectorMutation.isPending ? "取消中..." : "取消任务",
        onClick: () => cancelAutoDirectorMutation.mutate(task.id),
        variant: "destructive",
        disabled: cancelAutoDirectorMutation.isPending,
      });
    } else if (isDirectorExitActionExpanded) {
      actions.push({
        label: "继续导演",
        onClick: () => setIsDirectorExitActionExpanded(false),
        variant: "outline",
        disabled: cancelAutoDirectorMutation.isPending,
      });
      actions.push({
        label: cancelAutoDirectorMutation.isPending ? "退出中..." : "退出导演模式",
        onClick: () => cancelAutoDirectorMutation.mutate(task.id),
        variant: "destructive",
        disabled: cancelAutoDirectorMutation.isPending,
      });
    } else {
      actions.push({
        label: "退出导演模式",
        onClick: () => setIsDirectorExitActionExpanded(true),
        variant: "destructive",
        disabled: cancelAutoDirectorMutation.isPending,
      });
    }
  } else if (
    task.status === "failed"
    || task.status === "cancelled"
  ) {
    actions.push({
      label: "收起此提醒",
      onClick: dismissTakeover,
      variant: "secondary",
    });
  } else if (canArchiveCompletedAutoDirectorTask(task)) {
    actions.push({
      label: archiveCompletedAutoDirectorMutation.isPending ? "收起中..." : "完成并收起",
      onClick: () => archiveCompletedAutoDirectorMutation.mutate(task.id),
      variant: "secondary",
      disabled: archiveCompletedAutoDirectorMutation.isPending,
    });
  } else if (task.status === "waiting_approval") {
    actions.push({
      label: "收起此提醒",
      onClick: dismissTakeover,
      variant: "secondary",
    });
  }
  actions.push({
    label: "执行详情",
    onClick: () => setIsTaskDrawerOpen(true),
    variant: mode === "running" ? "outline" : "secondary",
  });

  return {
    mode,
    title: consistencyIssue === "missing_characters"
      ? `《${title}》导演产物未补齐角色准备`
      : consistencyIssue === "missing_chapters"
        ? `《${title}》导演产物未连接到章节执行区`
        : task.pendingManualRecovery
          ? `《${title}》等待从检查点恢复`
        : buildTakeoverTitle({
          mode,
          novelTitle: title,
          checkpointType: task.checkpointType,
          scopeLabel: autoExecutionScopeLabel,
        }),
    description: consistencyIssue === "missing_characters"
      ? "任务记录显示已完成开书交接，但当前项目里还没有角色资产，所以角色准备和章节执行都不完整。可以直接补齐导演产物，系统会继续修复。"
      : consistencyIssue === "missing_chapters"
        ? "任务记录显示前几章已经可开写，但当前章节执行区还是空的，说明导演产物还没有完整落库。可以直接补齐导演产物继续修复。"
        : task.pendingManualRecovery
          ? "任务已停在当前进度。你可以查看执行详情，再从最近进度点继续。"
        : buildTakeoverDescription({
          mode,
          checkpointType: task.checkpointType,
          reviewScope: scope,
          scopeLabel: autoExecutionScopeLabel,
        }),
    progress: typeof dashboardView?.progressPercent === "number"
      ? dashboardView.progressPercent
      : task.progress,
    currentAction: consistencyIssue === "missing_characters"
      ? "检测到角色准备仍为空，当前导演结果需要继续补齐。"
      : consistencyIssue === "missing_chapters"
        ? "检测到章节执行区为空，当前导演结果需要继续同步章节资源。"
        : task.pendingManualRecovery
          ? (
            task.blockingReason?.trim()
            || task.recoveryHint?.trim()
            || task.lastError?.trim()
            || "任务已暂停，等待从最近检查点恢复。"
          )
        : dashboardView?.currentAction?.trim()
          ? dashboardView.currentAction.trim()
        : activeDirectorSnapshot?.displayState.currentAction?.trim()
          ? activeDirectorSnapshot.displayState.currentAction.trim()
        : automationActionText
          ? automationActionText
        : mode === "running" && task.checkpointType === "chapter_batch_ready" && task.currentItemLabel?.includes("已暂停")
          ? `正在继续自动执行${autoExecutionScopeLabel}`
          : task.currentItemLabel ?? null,
    checkpointLabel: consistencyIssue
      ? "导演产物待补齐"
      : task.pendingManualRecovery
        ? "等待恢复"
      : mode === "running" && task.checkpointType === "chapter_batch_ready"
        ? `${autoExecutionScopeLabel}自动执行中`
        : formatTakeoverCheckpoint(task.checkpointType, task),
    taskId: task.id,
    actions,
  };
}

export interface BuildTaskDrawerActionsParams {
  displayAutoDirectorTask: UnifiedTaskDetail | null;
  activeAutoDirectorTask: UnifiedTaskDetail | null;
  activeChapterTitleWarning: ChapterTitleWarning | null;
  hasUnsavedVolumeDraft: boolean;
  consistencyIssue: "missing_characters" | "missing_chapters" | null;
  chapterTitleRepairMutation: ChapterTitleRepairMutation;
  continueAutoDirectorMutation: MutationLike;
  continueAutoExecutionMutation: MutationLike;
  cancelAutoDirectorMutation: MutationLike;
  reviewTab: string | null;
  setActiveTab: (tab: string) => void;
  setIsTaskDrawerOpen: (open: boolean) => void;
  openCandidateSelection: (taskId?: string) => void;
  openReviewStage: () => void;
  openChapterExecution: (task?: UnifiedTaskDetail | null) => void;
  openQualityRepair: (task?: UnifiedTaskDetail | null) => void;
}

export function buildTaskDrawerActions(params: BuildTaskDrawerActionsParams): NovelTaskDrawerState["actions"] {
  const {
    displayAutoDirectorTask,
    activeChapterTitleWarning,
    hasUnsavedVolumeDraft,
    consistencyIssue,
    chapterTitleRepairMutation,
    continueAutoDirectorMutation,
    continueAutoExecutionMutation,
    cancelAutoDirectorMutation,
    reviewTab,
    setActiveTab,
    setIsTaskDrawerOpen,
    openCandidateSelection,
    openReviewStage,
    openChapterExecution,
    openQualityRepair,
  } = params;

  const task = displayAutoDirectorTask;
  if (!task) {
    return [];
  }
  const actions: NovelTaskDrawerState["actions"] = [];
  if (activeChapterTitleWarning) {
    actions.push({
      label: chapterTitleRepairMutation.isPending && chapterTitleRepairMutation.pendingTaskId === task.id
        ? "AI 修复中..."
        : activeChapterTitleWarning.label,
      onClick: () => {
        if (hasUnsavedVolumeDraft) {
          toast.error("当前拆章工作区还有未保存修改，请先保存工作区，再发起 AI 修复标题。");
          return;
        }
        chapterTitleRepairMutation.startRepair(task);
      },
      variant: "default",
      disabled: chapterTitleRepairMutation.isPending,
    });
  }
  if (consistencyIssue) {
    actions.push({
      label: continueAutoDirectorMutation.isPending ? "补齐中..." : "补齐导演产物",
      onClick: () => continueAutoDirectorMutation.mutate({ directorTaskId: task.id }),
      variant: "default",
      disabled: continueAutoDirectorMutation.isPending,
    });
    if (consistencyIssue === "missing_characters") {
      actions.push({
        label: "去角色准备",
        onClick: () => {
          setActiveTab("character");
          setIsTaskDrawerOpen(false);
        },
        variant: "outline",
      });
    }
  } else if (task.pendingManualRecovery) {
    actions.push({
      label: continueAutoDirectorMutation.isPending ? "继续中..." : "继续自动导演",
      onClick: () => continueAutoDirectorMutation.mutate({ directorTaskId: task.id }),
      variant: "default",
      disabled: continueAutoDirectorMutation.isPending,
    });
  } else if (
    task.status === "waiting_approval"
    && task.checkpointType === "chapter_batch_ready"
  ) {
    const autoExecutionScopeLabel = resolveAutoExecutionScopeLabel(task);
    actions.push({
      label: buildContinueAutoExecutionActionLabel(autoExecutionScopeLabel, continueAutoExecutionMutation.isPending),
      onClick: () => continueAutoExecutionMutation.mutate({ directorTaskId: task.id }),
      variant: "default",
      disabled: continueAutoExecutionMutation.isPending,
    });
    actions.push({
      label: "进入章节执行",
      onClick: () => openChapterExecution(task),
      variant: "outline",
    });
  } else if (task.status === "waiting_approval" && task.checkpointType === "candidate_selection_required") {
    actions.push({
      label: "去确认书级方向",
      onClick: () => openCandidateSelection(task.id),
      variant: "default",
    });
  } else if (task.status === "waiting_approval" && task.checkpointType === "replan_required") {
    const autoExecutionScopeLabel = resolveAutoExecutionScopeLabel(task);
    actions.push({
      label: buildSkipQualityRepairActionLabel(autoExecutionScopeLabel, continueAutoExecutionMutation.isPending),
      onClick: () => continueAutoExecutionMutation.mutate({
        directorTaskId: task.id,
        continuationMode: "skip_quality_repair",
      }),
      variant: "default",
      disabled: continueAutoExecutionMutation.isPending,
    });
    actions.push({
      label: "打开质量修复",
      onClick: () => openQualityRepair(task),
      variant: "outline",
    });
  } else if (
    task.status === "waiting_approval"
    && reviewTab
    && task.checkpointType !== "chapter_batch_ready"
  ) {
    actions.push({
      label: "去当前审核阶段",
      onClick: openReviewStage,
      variant: "default",
    });
    actions.push({
      label: continueAutoDirectorMutation.isPending ? "继续中..." : "继续自动导演",
      onClick: () => continueAutoDirectorMutation.mutate({ directorTaskId: task.id }),
      variant: "outline",
      disabled: continueAutoDirectorMutation.isPending,
    });
  } else if ((task.status === "failed" || task.status === "cancelled") && task.checkpointType === "chapter_batch_ready") {
    const autoExecutionScopeLabel = resolveAutoExecutionScopeLabel(task);
    actions.push({
      label: buildContinueAutoExecutionActionLabel(autoExecutionScopeLabel, continueAutoExecutionMutation.isPending),
      onClick: () => continueAutoExecutionMutation.mutate({ directorTaskId: task.id }),
      variant: "default",
      disabled: continueAutoExecutionMutation.isPending,
    });
    actions.push({
      label: "打开质量修复",
      onClick: () => openQualityRepair(task),
      variant: "outline",
    });
  } else if (task.checkpointType === "chapter_batch_ready" || task.checkpointType === "workflow_completed") {
    actions.push({
      label: "进入章节执行",
      onClick: () => openChapterExecution(task),
      variant: "default",
    });
  }

  if (canCancelDirectorTask(task)) {
    actions.push({
      label: cancelAutoDirectorMutation.isPending ? "取消中..." : "取消任务",
      onClick: () => cancelAutoDirectorMutation.mutate(task.id),
      variant: "destructive",
      disabled: cancelAutoDirectorMutation.isPending,
    });
  }
  return actions;
}
