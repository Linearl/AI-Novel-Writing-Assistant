import type { AutoDirectorCreateController } from "../useAutoDirectorCreateController";
import type { NovelBasicFormState } from "../../novelBasicInfo.shared";
import {
  BASIC_INFO_FIELD_HINTS,
  DEFAULT_ESTIMATED_CHAPTER_COUNT,
  EMOTION_OPTIONS,
  PACE_OPTIONS,
  POV_OPTIONS,
  READER_CHANNEL_OPTIONS,
} from "../../novelBasicInfo.shared";
import { FieldLabel, findOptionSummary } from "../basicInfoForm/BasicInfoFormPrimitives";
import { BookFramingSection } from "../basicInfoForm/BookFramingSection";
import { BookFramingQuickFillButton } from "../basicInfoForm/BookFramingQuickFillButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

interface StageBasicSetupProps {
  controller: Pick<
    AutoDirectorCreateController,
    | "directorBasicForm"
    | "setActiveStep"
    | "markStepCompleted"
    | "handleQuickGenerate"
    | "idea"
  > & {
    onBasicFormChange?: (patch: Partial<NovelBasicFormState>) => void;
  };
  genreOptions: Array<{ id: string; path: string; label: string }>;
  worldOptions: Array<{ id: string; name: string }>;
}

export default function StageBasicSetup({ controller, genreOptions, worldOptions }: StageBasicSetupProps) {
  const {
    directorBasicForm,
    idea,
    setActiveStep,
    markStepCompleted,
    handleQuickGenerate,
  } = controller;

  const onBasicFormChange = ("onBasicFormChange" in controller ? (controller as Record<string, unknown>).onBasicFormChange as ((patch: Partial<NovelBasicFormState>) => void) | undefined : undefined) ?? undefined;

  const basicForm = directorBasicForm;

  const handleBack = () => setActiveStep("idea");
  const handleContinue = () => {
    markStepCompleted("basic");
    setActiveStep("world_style");
  };

  const hasEditableBasicForm = typeof onBasicFormChange === "function";
  const hasLargeChapterPlan = basicForm.estimatedChapterCount > 200;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">步骤 2：导演起始设置</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          只保留自动导演真正需要你快速确认的参数。先保持默认也可以，只有你明确想要某种手感时再调整。
        </p>
      </div>

      <section className="min-w-0 rounded-xl border bg-muted/20 p-3 sm:p-4">
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <FieldLabel htmlFor="stage-basic-reader-channel" hint={BASIC_INFO_FIELD_HINTS.readerChannelPreference}>读者频道倾向</FieldLabel>
            <select
              id="stage-basic-reader-channel"
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={basicForm.readerChannelPreference}
              onChange={(event) => onBasicFormChange?.({
                readerChannelPreference: event.target.value as NovelBasicFormState["readerChannelPreference"],
              })}
            >
              {READER_CHANNEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              {findOptionSummary(READER_CHANNEL_OPTIONS, basicForm.readerChannelPreference)}
            </div>
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="stage-basic-pov" hint={BASIC_INFO_FIELD_HINTS.narrativePov}>叙事视角</FieldLabel>
            <select
              id="stage-basic-pov"
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={basicForm.narrativePov}
              onChange={(event) => onBasicFormChange?.({
                narrativePov: event.target.value as NovelBasicFormState["narrativePov"],
              })}
            >
              {POV_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              {findOptionSummary(POV_OPTIONS, basicForm.narrativePov)}
            </div>
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="stage-basic-pace" hint={BASIC_INFO_FIELD_HINTS.pacePreference}>节奏偏好</FieldLabel>
            <select
              id="stage-basic-pace"
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={basicForm.pacePreference}
              onChange={(event) => onBasicFormChange?.({
                pacePreference: event.target.value as NovelBasicFormState["pacePreference"],
              })}
            >
              {PACE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              {findOptionSummary(PACE_OPTIONS, basicForm.pacePreference)}
            </div>
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="stage-basic-emotion" hint={BASIC_INFO_FIELD_HINTS.emotionIntensity}>情绪浓度</FieldLabel>
            <select
              id="stage-basic-emotion"
              className="w-full rounded-md border bg-background p-2 text-sm"
              value={basicForm.emotionIntensity}
              onChange={(event) => onBasicFormChange?.({
                emotionIntensity: event.target.value as NovelBasicFormState["emotionIntensity"],
              })}
            >
              {EMOTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              {findOptionSummary(EMOTION_OPTIONS, basicForm.emotionIntensity)}
            </div>
          </div>

          <div className="space-y-2">
            <FieldLabel htmlFor="stage-basic-estimated" hint={BASIC_INFO_FIELD_HINTS.estimatedChapterCount}>预计章节数</FieldLabel>
            <Input
              id="stage-basic-estimated"
              type="number"
              min={1}
              max={2000}
              value={basicForm.estimatedChapterCount}
              onChange={(event) => onBasicFormChange?.({
                estimatedChapterCount: Math.max(
                  1,
                  Math.min(2000, Number(event.target.value || 0) || DEFAULT_ESTIMATED_CHAPTER_COUNT),
                ),
              })}
            />
            <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              会作为整书结构密度和后续卷章规划的参考，不是硬性上限。
            </div>
            {hasLargeChapterPlan ? (
              <div className={`rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                建议先小范围尝试：先查看规划和前期章节方向，确认符合想法后再扩大产出范围。
              </div>
            ) : null}
          </div>

          {hasEditableBasicForm ? (
            <BookFramingSection
              basicForm={basicForm}
              onFormChange={onBasicFormChange}
              quickFill={(
                <BookFramingQuickFillButton
                  basicForm={basicForm}
                  genreOptions={genreOptions}
                  descriptionOverride={idea}
                  onApplySuggestion={onBasicFormChange}
                />
              )}
            />
          ) : null}
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleBack}>上一步</Button>
          <Button type="button" variant="outline" size="sm" onClick={handleQuickGenerate} disabled={!idea.trim()}>
            跳过，直接生成方向
          </Button>
        </div>
        <Button type="button" size="sm" onClick={handleContinue}>继续</Button>
      </div>
    </div>
  );
}
