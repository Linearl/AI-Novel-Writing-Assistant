/**
 * REQ-3022: Shared Core for StageModelRun — extracts the run-mode selector,
 * execution-range fields, auto-approval panel, post-generation style switch,
 * and LLM selector.
 *
 * Used by:
 * - autoDirector/StageModelRun.tsx (fullscreen layout)
 * - autoDirectorCreate/StageModelRun.tsx (compact/dialog layout)
 */
import type { ReactNode } from "react";
import type { DirectorRunMode } from "@ai-novel/shared/types/novelDirector";
import type {
  DirectorAutoApprovalGroup,
  DirectorAutoApprovalPoint,
} from "@ai-novel/shared/types/autoDirectorApproval";
import type { NovelBasicFormState } from "../../../novelBasicInfo.shared";
import type { RunModeOption } from "./stageConstants";
import {
  type DirectorAutoExecutionDraftState,
  DirectorAutoExecutionPlanFields,
} from "../../directorAutoExecutionPlan.shared";
import AutoDirectorApprovalStrategyPanel from "@/components/autoDirector/AutoDirectorApprovalStrategyPanel";
import LLMSelector from "@/components/common/LLMSelector";
import { Switch } from "@/components/ui/switch";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

// ── Run-mode selector ──────────────────────────────────────────────

export interface StageModelRunModeSelectorProps {
  runMode: DirectorRunMode;
  runModeOptions: RunModeOption[];
  onRunModeChange: (value: DirectorRunMode) => void;
  /** CSS class overrides per variant. */
  classes?: {
    gridCols?: string;
    buttonActive?: string;
    buttonInactive?: string;
  };
  /**
   * Render a recommendation badge inside the button.
   * "pill" = inline pill (fullscreen), "badge" = StatusBadge (compact).
   */
  recommendationStyle?: "pill" | "badge";
  renderRecommendationBadge?: (active: boolean) => ReactNode;
}

/**
 * Renders the 3 run-mode option buttons (full book autopilot / auto-to-ready /
 * auto-to-execution). Both wrappers share identical structure; only the CSS
 * and badge rendering differ via props.
 */
export function renderModelRunModeSelector(props: StageModelRunModeSelectorProps): ReactNode {
  const {
    runMode,
    runModeOptions,
    onRunModeChange,
    classes,
    renderRecommendationBadge,
  } = props;
  const gridCols = classes?.gridCols ?? "md:grid-cols-3";
  const activeCls = classes?.buttonActive ?? "bg-foreground text-background ring-foreground shadow-sm";
  const inactiveCls = classes?.buttonInactive ?? "bg-muted/30 text-foreground ring-border/20 hover:bg-muted/50";

  return (
    <div className={`grid gap-3 ${gridCols}`}>
      {runModeOptions.map((option) => {
        const active = option.value === runMode;
        return (
          <button
            key={option.value}
            type="button"
            className={`rounded-lg px-4 py-4 text-left transition ring-1 ${
              active ? activeCls : inactiveCls
            }`}
            onClick={() => onRunModeChange(option.value)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-medium">{option.label}</div>
              {option.recommended && renderRecommendationBadge ? renderRecommendationBadge(active) : null}
            </div>
            <div
              className={`mt-2 text-xs leading-5 ${active ? "text-background/70" : "text-muted-foreground"} ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}
            >
              {option.description}
            </div>
            {option.recommendation ? (
              <div
                className={`mt-3 text-xs leading-5 ${active ? "text-background/75" : "text-muted-foreground"} ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}
              >
                建议：{option.recommendation}
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

// ── Execution range + auto-approval ─────────────────────────────────

export interface StageModelRunExecutionRangeProps {
  runMode: DirectorRunMode;
  autoExecutionDraft: DirectorAutoExecutionDraftState;
  onAutoExecutionDraftChange: (patch: Partial<DirectorAutoExecutionDraftState>) => void;
  maxChapterCount: number;
  autoApprovalEnabled: boolean;
  autoApprovalCodes: string[];
  autoApprovalGroups?: DirectorAutoApprovalGroup[];
  autoApprovalPoints?: DirectorAutoApprovalPoint[];
  onAutoApprovalEnabledChange: (enabled: boolean) => void;
  onAutoApprovalCodesChange: (next: string[]) => void;
}

/**
 * Renders the conditional execution-range + auto-approval panel shown when
 * runMode === "auto_to_execution", plus the full-book-autopilot note.
 */
export function renderModelRunExecutionRange(props: StageModelRunExecutionRangeProps): ReactNode {
  const {
    runMode,
    autoExecutionDraft,
    onAutoExecutionDraftChange,
    maxChapterCount,
    autoApprovalEnabled,
    autoApprovalCodes,
    autoApprovalGroups,
    autoApprovalPoints,
    onAutoApprovalEnabledChange,
    onAutoApprovalCodesChange,
  } = props;

  if (runMode === "auto_to_execution") {
    return (
      <div className="space-y-4 pt-2">
        <div>
          <div className="text-sm font-medium text-foreground">执行范围与自动确认</div>
          <div className={`mt-1 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            只在你选择按范围执行时生效，用来控制 AI 直接推进到哪里。
          </div>
        </div>
        <DirectorAutoExecutionPlanFields
          draft={autoExecutionDraft}
          onChange={onAutoExecutionDraftChange}
          usage="new_book"
          maxChapterCount={maxChapterCount}
        />
        <AutoDirectorApprovalStrategyPanel
          enabled={autoApprovalEnabled}
          approvalPointCodes={autoApprovalCodes}
          groups={autoApprovalGroups}
          approvalPoints={autoApprovalPoints}
          onEnabledChange={onAutoApprovalEnabledChange}
          onApprovalPointCodesChange={onAutoApprovalCodesChange}
        />
      </div>
    );
  }

  if (runMode === "full_book_autopilot") {
    return (
      <div className={`space-y-1 pt-2 text-sm leading-6 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
        <div className="font-medium text-foreground">全书自动成书</div>
        <div>
          系统会以整本书为目标完成规划、拆章、正文生成、审校和修复。只有模型不可用、服务异常、正文保护或不可恢复风险会停下。
        </div>
      </div>
    );
  }

  return null;
}

// ── Post-generation style switch ────────────────────────────────────

export interface StageModelRunStyleSwitchProps {
  basicForm: NovelBasicFormState;
  onBasicFormChange: (patch: Partial<NovelBasicFormState>) => void;
  /** Supply if the caller has a conditional onBasicFormChange. */
  onBasicFormChangeMaybe?: ((patch: Partial<NovelBasicFormState>) => void) | null;
}

export function renderModelRunStyleSwitch(props: StageModelRunStyleSwitchProps): ReactNode {
  const { basicForm, onBasicFormChange, onBasicFormChangeMaybe } = props;
  const change = onBasicFormChangeMaybe ?? onBasicFormChange;

  return (
    <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <div className="text-sm font-medium text-foreground">正文后去 AI 检测与修正</div>
        <div className={`text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
          开启后，章节正文生成完成时会检测 AI 味风险，并在命中可修正问题时生成修订稿。
        </div>
      </div>
      <Switch
        aria-label="正文后去 AI 检测与修正"
        checked={basicForm.postGenerationStyleReviewEnabled}
        onCheckedChange={(checked) => change({ postGenerationStyleReviewEnabled: checked })}
      />
    </div>
  );
}

// ── LLM selector ────────────────────────────────────────────────────

export function renderModelRunLlmSelector(): ReactNode {
  return (
    <details className="group pt-1">
      <summary className="cursor-pointer list-none">
        <div className="text-sm font-medium text-foreground">模型与质量</div>
        <div className={`mt-1 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
          默认跟随路由配置，系统会根据任务类型自动选择最优模型。需要临时换模型时再展开调整。
        </div>
      </summary>
      <div className="mt-4">
        <LLMSelector allowRouteModel showTemperature showHelperText={false} />
      </div>
    </details>
  );
}
