import type { AutoDirectorCreateController } from "../useAutoDirectorCreateController";
import type { NovelBasicFormState } from "../../novelBasicInfo.shared";
import { renderBasicSetupCoreFields, renderBasicSetupFramingFields } from "./shared/StageBasicSetupCore";
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
  const hasEditableBasicForm = typeof onBasicFormChange === "function";
  const controlClassName = "w-full rounded-md border bg-background p-2 text-sm";

  const handleBack = () => setActiveStep("idea");
  const handleContinue = () => {
    markStepCompleted("basic");
    setActiveStep("world_style");
  };

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
          {renderBasicSetupCoreFields({
            basicForm,
            onBasicFormChange: onBasicFormChange as (patch: Partial<NovelBasicFormState>) => void,
            controlClassName,
            idPrefix: "stage-basic-",
          })}

          {hasEditableBasicForm ? (
            <div className="contents">
              {renderBasicSetupFramingFields({
                basicForm,
                onBasicFormChange: onBasicFormChange as (patch: Partial<NovelBasicFormState>) => void,
                genreOptions,
                idea,
                controlClassName,
                idPrefix: "stage-basic-",
              })}
            </div>
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
