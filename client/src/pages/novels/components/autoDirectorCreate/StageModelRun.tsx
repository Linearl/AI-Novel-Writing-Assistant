import type { AutoDirectorCreateController } from "../useAutoDirectorCreateController";
import type { NovelBasicFormState } from "../../novelBasicInfo.shared";
import type { DirectorAutoExecutionDraftState } from "../directorAutoExecutionPlan.shared";
import { DirectorAutoExecutionPlanFields } from "../directorAutoExecutionPlan.shared";
import AutoDirectorApprovalStrategyPanel from "@/components/autoDirector/AutoDirectorApprovalStrategyPanel";
import LLMSelector from "@/components/common/LLMSelector";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { StatusBadge } from "@/components/ui/status-badge";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";
import { RUN_MODE_OPTIONS } from "./shared/stageConstants";

interface StageModelRunProps {
  controller: Pick<
    AutoDirectorCreateController,
    | "directorBasicForm"
    | "runMode"
    | "setRunMode"
    | "autoExecutionDraft"
    | "setAutoExecutionDraft"
    | "autoApprovalDraft"
    | "batches"
    | "setActiveStep"
    | "markStepCompleted"
    | "handleGenerate"
    | "canGenerate"
  >;
  onBasicFormChange?: (patch: Partial<NovelBasicFormState>) => void;
}

export default function StageModelRun({ controller, onBasicFormChange }: StageModelRunProps) {
  const {
    directorBasicForm,
    runMode,
    setRunMode,
    autoExecutionDraft,
    setAutoExecutionDraft,
    autoApprovalDraft,
    batches,
    setActiveStep,
    markStepCompleted,
    handleGenerate,
    canGenerate,
  } = controller;

  const basicForm = directorBasicForm;
  const hasEditableBasicForm = typeof onBasicFormChange === "function";

  const handleBack = () => setActiveStep("world_style");
  const handleContinue = () => {
    markStepCompleted("model_run");
    handleGenerate();
  };

  const hasBatches = batches.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">步骤 4：模型与运行方式</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          选择 AI 模型的运行模式和执行范围。拿不准时用推荐设置即可。
        </p>
      </div>

      <div className="min-w-0 space-y-4">
        {/* Model Settings */}
        <section className="min-w-0 rounded-xl border bg-background/70 p-3 sm:p-4">
          <div className="text-sm font-medium text-foreground">模型设置</div>
          <div className="mt-3">
            <LLMSelector />
          </div>
        </section>

        {/* Run Mode */}
        <section className="min-w-0 rounded-xl border bg-background/70 p-3 sm:p-4">
          <div className="text-sm font-medium text-foreground">自动导演运行方式</div>

          {hasEditableBasicForm ? (
            <div className="mt-3 rounded-lg border bg-muted/15 p-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground">正文后去 AI 检测与修正</div>
                  <div className={`text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                    开启后，章节正文生成完成时会检测 AI 味风险，并在命中可修正问题时生成修订稿。
                  </div>
                </div>
                <Switch
                  aria-label="正文后去 AI 检测与修正"
                  checked={basicForm.postGenerationStyleReviewEnabled}
                  onCheckedChange={(checked) => onBasicFormChange?.({ postGenerationStyleReviewEnabled: checked })}
                />
              </div>
            </div>
          ) : null}

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
            {RUN_MODE_OPTIONS.map((option) => {
              const active = option.value === runMode;
              const recommended = option.recommended;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    recommended
                      ? active
                        ? "border-emerald-600 bg-emerald-50 shadow-sm ring-2 ring-emerald-500/25"
                        : "border-emerald-500/70 bg-emerald-50/80 shadow-sm ring-1 ring-emerald-500/20 hover:border-emerald-600"
                      : active
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border bg-background hover:border-primary/40"
                  }`}
                  onClick={() => setRunMode(option.value)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium text-foreground">{option.label}</div>
                    {recommended ? (
                      <StatusBadge variant="success" solid className="shrink-0">推荐</StatusBadge>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</div>
                  {option.recommendation ? (
                    <div className={`mt-2 rounded-md border border-emerald-500/30 bg-white/70 px-2 py-1.5 text-xs leading-5 text-emerald-900 ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                      {option.recommendation}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>

          {runMode === "auto_to_execution" ? (
            <>
              <DirectorAutoExecutionPlanFields
                draft={autoExecutionDraft}
                onChange={(patch) => setAutoExecutionDraft((prev) => ({ ...prev, ...patch } as DirectorAutoExecutionDraftState))}
                usage="new_book"
                maxChapterCount={basicForm.estimatedChapterCount}
              />
              <AutoDirectorApprovalStrategyPanel
                enabled={autoApprovalDraft.enabled}
                approvalPointCodes={autoApprovalDraft.codes}
                groups={autoApprovalDraft.groups}
                approvalPoints={autoApprovalDraft.points}
                onEnabledChange={autoApprovalDraft.setEnabled}
                onApprovalPointCodesChange={autoApprovalDraft.setCodes}
              />
            </>
          ) : null}

          {runMode === "full_book_autopilot" ? (
            <div className={`mt-3 rounded-md border border-primary/15 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              <div className="text-sm font-medium text-foreground">全书自动成书</div>
              <div className="mt-1">
                系统会以整本书为目标完成规划、拆章、正文生成、审校和修复。只有模型不可用、服务异常、正文保护或不可恢复风险会停下。
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <Button type="button" variant="outline" size="sm" onClick={handleBack}>上一步</Button>
        <div className="flex items-center gap-2">
          {hasBatches ? (
            <span className="text-xs text-muted-foreground">已有 {batches.length} 批方案</span>
          ) : null}
          <Button type="button" size="sm" onClick={handleContinue} disabled={!canGenerate}>
            开始生成方向
          </Button>
        </div>
      </div>
    </div>
  );
}
