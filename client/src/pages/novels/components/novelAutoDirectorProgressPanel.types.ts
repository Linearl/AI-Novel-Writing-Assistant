import type { UnifiedTaskDetail } from "@ai-novel/shared";

export type DirectorExecutionViewMode = "execution_progress" | "execution_failed";

export interface NovelAutoDirectorProgressPanelProps {
  mode: DirectorExecutionViewMode;
  task: UnifiedTaskDetail | null;
  taskId: string;
  titleHint?: string;
  fallbackError?: string | null;
  onBackgroundContinue: () => void;
  onConfirmAndContinue?: () => void;
  isConfirmingAndContinuing?: boolean;
  onOpenTaskCenter: () => void;
  onRetry?: () => void;
  onRetryWithResume?: () => void;
  retryPending?: boolean;
}

export type DirectorStepVisualStatus = "pending" | "running" | "completed" | "failed";

export type DirectorStepDefinition = {
  key: string;
  label: string;
};
