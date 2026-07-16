import type { AutoDirectorCreateController } from "../useAutoDirectorCreateController";
import type { NovelBasicFormState } from "../../novelBasicInfo.shared";
import { BASIC_INFO_FIELD_HINTS } from "../../novelBasicInfo.shared";
import { FieldLabel } from "../basicInfoForm/BasicInfoFormPrimitives";
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
        {/* Reference World Sample */}
        <div className="space-y-2">
          <FieldLabel htmlFor="stage-world-ref" hint={BASIC_INFO_FIELD_HINTS.worldId}>规划参考世界样本</FieldLabel>
          <select
            id="stage-world-ref"
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={basicForm.worldId}
            onChange={(event) => onBasicFormChange?.({ worldId: event.target.value })}
          >
            <option value="">不指定参考世界</option>
            {worldOptions.length === 0 ? (
              <option value="" disabled>暂无可选世界样本</option>
            ) : null}
            {worldOptions.map((world) => (
              <option key={world.id} value={world.id}>{world.name}</option>
            ))}
          </select>
          <div className={`text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            {worldOptions.length > 0
              ? '这里只给自动导演提供快速参考。完整导入、生成和同步请在小说页的"本书世界"中完成。'
              : '没有可选世界样本时，可以先用起始想法开书。'}
          </div>
        </div>

        {/* World Setup Mode */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">本书世界处理</div>
          {selectedWorld ? (
            <div className={`text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
              自动导演会使用「{selectedWorld.name}」作为本书世界样本，并在角色准备前整理可用于本书的世界约束。
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                className={`rounded-lg border p-3 text-left transition ${
                  worldSetupMode === "auto_generate"
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-background hover:border-primary/40"
                }`}
                onClick={() => setWorldSetupMode("auto_generate")}
              >
                <div className="text-sm font-medium text-foreground">根据宏观规划生成本书世界</div>
                <div className={`mt-1 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                  适合奇幻、玄幻、科幻、悬疑等需要世界规则支撑的项目。
                </div>
              </button>
              <button
                type="button"
                className={`rounded-lg border p-3 text-left transition ${
                  worldSetupMode === "skip"
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border bg-background hover:border-primary/40"
                }`}
                onClick={() => setWorldSetupMode("skip")}
              >
                <div className="text-sm font-medium text-foreground">暂不使用世界观</div>
                <div className={`mt-1 text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
                  适合现实题材、轻设定项目，角色和章节会主要依据书级规划推进。
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Style Profile */}
        <div className="space-y-2">
          <FieldLabel htmlFor="stage-style-profile" hint="可选。选定后，导演前半段会只读取轻量写法摘要，正文阶段再继续使用完整写法规则。">
            书级默认写法
          </FieldLabel>
          <select
            id="stage-style-profile"
            className="w-full rounded-md border bg-background p-2 text-sm"
            value={selectedStyleProfileId}
            onChange={(event) => setSelectedStyleProfileId(event.target.value)}
          >
            <option value="">先只用文风关键词</option>
            {styleProfileOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
            ))}
          </select>
          <div className={`text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            有沉淀好的写法资产时，建议直接选一套，帮助你更清楚地预期导演会怎样写。
          </div>
        </div>
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
