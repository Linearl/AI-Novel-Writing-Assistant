import type { DirectorWorldSetupMode } from "@ai-novel/shared/types/novelDirector";
import type { StyleIntentSummary } from "@ai-novel/shared/types/styleEngine";
import {
  renderWorldStyleWorldSelector,
  renderWorldStyleSetupMode,
  renderWorldStyleStyleProfile,
} from "../components/autoDirectorCreate/shared/StageWorldStyleCore";
import { Button } from "@/components/ui/button";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";
import type { NovelBasicFormState } from "../novelBasicInfo.shared";

interface StageWorldStyleProps {
  basicForm: NovelBasicFormState;
  worldOptions: Array<{ id: string; name: string }>;
  worldSetupMode: DirectorWorldSetupMode;
  onWorldSetupModeChange: (value: DirectorWorldSetupMode) => void;
  styleProfileOptions: Array<{ id: string; name: string }>;
  selectedStyleProfileId: string;
  selectedStyleSummary: StyleIntentSummary | null;
  onStyleProfileChange: (value: string) => void;
  onBasicFormChange: (patch: Partial<NovelBasicFormState>) => void;
  onBack: () => void;
  onConfirm: () => void;
}

export default function StageWorldStyle({
  basicForm,
  worldOptions,
  worldSetupMode,
  onWorldSetupModeChange,
  styleProfileOptions,
  selectedStyleProfileId,
  selectedStyleSummary,
  onStyleProfileChange,
  onBasicFormChange,
  onBack,
  onConfirm,
}: StageWorldStyleProps) {
  const selectedWorld = worldOptions.find((world) => world.id === basicForm.worldId) ?? null;
  const controlClassName = "w-full rounded-lg border-0 bg-muted/40 px-3 py-2.5 text-sm outline-none ring-1 ring-transparent transition hover:bg-muted/55 focus:bg-background focus:ring-2 focus:ring-primary/25";

  return (
    <section className="mx-auto w-full max-w-5xl space-y-7 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-2xl font-semibold tracking-normal text-foreground">给故事一个世界底色</div>
          <div className={`mt-2 max-w-2xl text-sm leading-6 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
            可以选一个世界样本给 AI 参考，也可以让它根据起始想法自动整理本书世界。写法会作为后续规划和正文的默认语气。
          </div>
        </div>
        <div className="rounded-full bg-muted/55 px-3 py-1 text-xs text-muted-foreground">
          可保持默认
        </div>
      </div>

      <div className="space-y-5">
        {renderWorldStyleWorldSelector({
          basicForm,
          onBasicFormChange,
          worldOptions,
          controlClassName,
          idPrefix: "director-basic-",
        })}

        <div className="space-y-3 pt-2">
          <div className="text-sm font-medium text-foreground">本书世界处理</div>
          {renderWorldStyleSetupMode({
            selectedWorld,
            worldSetupMode,
            onWorldSetupModeChange,
          })}
        </div>

        {renderWorldStyleStyleProfile({
          selectedStyleProfileId,
          onStyleProfileChange: onStyleProfileChange,
          styleProfileOptions,
          selectedStyleSummary,
          controlClassName,
          idPrefix: "director-basic-",
        })}
      </div>

      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>返回起始设置</Button>
        <Button type="button" onClick={onConfirm}>确认世界与写法</Button>
      </div>
    </section>
  );
}
