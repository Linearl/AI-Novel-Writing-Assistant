import type { AutoDirectorCreateController } from "../useAutoDirectorCreateController";
import type { NovelBasicFormState } from "../../novelBasicInfo.shared";
import {
  renderWorldStyleWorldSelector,
  renderWorldStyleSetupMode,
  renderWorldStyleStyleProfile,
} from "./shared/StageWorldStyleCore";
import { Button } from "@/components/ui/button";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

interface StageWorldStyleProps {
  controller: Pick<
    AutoDirectorCreateController,
    | "directorBasicForm"
    | "worldSetupMode"
    | "setWorldSetupMode"
    | "selectedStyleProfileId"
    | "setSelectedStyleProfileId"
    | "styleProfiles"
    | "setActiveStep"
    | "markStepCompleted"
    | "handleQuickGenerate"
  >;
  worldOptions: Array<{ id: string; name: string }>;
  onBasicFormChange?: (patch: Partial<NovelBasicFormState>) => void;
}

export default function StageWorldStyle({ controller, worldOptions, onBasicFormChange }: StageWorldStyleProps) {
  const {
    directorBasicForm,
    worldSetupMode,
    setWorldSetupMode,
    selectedStyleProfileId,
    setSelectedStyleProfileId,
    styleProfiles,
    setActiveStep,
    markStepCompleted,
    handleQuickGenerate,
  } = controller;

  const basicForm = directorBasicForm;
  const selectedWorld = worldOptions.find((world) => world.id === basicForm.worldId) ?? null;
  const styleProfileOptions = styleProfiles.map((profile) => ({ id: profile.id, name: profile.name }));
  const controlClassName = "w-full rounded-md border bg-background p-2 text-sm";

  const handleBack = () => setActiveStep("basic");
  const handleContinue = () => {
    markStepCompleted("world_style");
    setActiveStep("model_run");
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">步骤 3：世界与写法</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          配置世界观生成方式和书级默认写法。不选则使用 AI 自动推荐。
        </p>
      </div>

      <section className="min-w-0 space-y-4 rounded-xl border bg-muted/20 p-3 sm:p-4">
        {renderWorldStyleWorldSelector({
          basicForm,
          onBasicFormChange: onBasicFormChange as (patch: Partial<NovelBasicFormState>) => void,
          worldOptions,
          controlClassName,
          idPrefix: "stage-world-",
        })}

        {/* World Setup Mode */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">本书世界处理</div>
          {renderWorldStyleSetupMode({
            selectedWorld,
            worldSetupMode,
            onWorldSetupModeChange: setWorldSetupMode,
            classes: {
              buttonActive: "border-primary bg-primary/10 shadow-sm",
              buttonInactive: "border-border bg-background hover:border-primary/40",
            },
          })}
        </div>

        {/* Style Profile */}
        {renderWorldStyleStyleProfile({
          selectedStyleProfileId,
          onStyleProfileChange: setSelectedStyleProfileId,
          styleProfileOptions,
          selectedStyleSummary: null,
          controlClassName,
          idPrefix: "stage-style-",
        })}
      </section>

      <div className="flex items-center justify-between gap-3 border-t pt-4">
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleBack}>上一步</Button>
          <Button type="button" variant="outline" size="sm" onClick={handleQuickGenerate}>
            跳过，直接生成方向
          </Button>
        </div>
        <Button type="button" size="sm" onClick={handleContinue}>继续</Button>
      </div>
    </div>
  );
}
