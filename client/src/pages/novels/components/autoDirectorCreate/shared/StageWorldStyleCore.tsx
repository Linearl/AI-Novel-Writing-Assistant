/**
 * REQ-3022: Shared Core for StageWorldStyle — extracts the world sample
 * selector, world-setup-mode toggle, and style profile dropdown.
 *
 * Used by:
 * - autoDirector/StageWorldStyle.tsx (fullscreen layout)
 * - autoDirectorCreate/StageWorldStyle.tsx (compact/dialog layout)
 */
import type { ReactNode } from "react";
import type { DirectorWorldSetupMode } from "@ai-novel/shared/types/novelDirector";
import type { StyleIntentSummary } from "@ai-novel/shared/types/styleEngine";
import type { NovelBasicFormState } from "../../../novelBasicInfo.shared";
import { BASIC_INFO_FIELD_HINTS } from "../../../novelBasicInfo.shared";
import { FieldLabel } from "../../basicInfoForm/BasicInfoFormPrimitives";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

// ── World sample dropdown ───────────────────────────────────────────

export interface StageWorldStyleWorldSelectorProps {
  basicForm: NovelBasicFormState;
  onBasicFormChange: (patch: Partial<NovelBasicFormState>) => void;
  worldOptions: Array<{ id: string; name: string }>;
  controlClassName: string;
  idPrefix?: string;
}

export function renderWorldStyleWorldSelector(props: StageWorldStyleWorldSelectorProps): ReactNode {
  const { basicForm, onBasicFormChange, worldOptions, controlClassName, idPrefix = "ws-core-" } = props;

  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={`${idPrefix}world`} hint={BASIC_INFO_FIELD_HINTS.worldId}>
        规划参考世界样本
      </FieldLabel>
      <select
        id={`${idPrefix}world`}
        className={controlClassName}
        value={basicForm.worldId}
        onChange={(event) => onBasicFormChange({ worldId: event.target.value })}
      >
        <option value="">不指定参考世界</option>
        {worldOptions.length === 0 ? (
          <option value="" disabled>
            暂无可选世界样本
          </option>
        ) : null}
        {worldOptions.map((world) => (
          <option key={world.id} value={world.id}>
            {world.name}
          </option>
        ))}
      </select>
      <div className={`text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
        {worldOptions.length > 0
          ? '这里只给自动导演提供快速参考。完整导入、生成和同步请在小说页的"本书世界"中完成。'
          : "没有可选世界样本时，可以先用起始想法开书。"}
      </div>
    </div>
  );
}

// ── World-setup-mode toggle ─────────────────────────────────────────

export interface StageWorldStyleSetupModeProps {
  selectedWorld: { id: string; name: string } | null;
  worldSetupMode: DirectorWorldSetupMode;
  onWorldSetupModeChange: (value: DirectorWorldSetupMode) => void;
  /** CSS class overrides per variant. */
  classes?: {
    buttonActive?: string;
    buttonInactive?: string;
  };
}

export function renderWorldStyleSetupMode(props: StageWorldStyleSetupModeProps): ReactNode {
  const { selectedWorld, worldSetupMode, onWorldSetupModeChange, classes } = props;
  const activeCls = classes?.buttonActive ?? "bg-foreground text-background ring-foreground shadow-sm";
  const inactiveCls = classes?.buttonInactive ?? "bg-background/60 text-foreground ring-border/25 hover:bg-background";

  if (selectedWorld) {
    return (
      <div className={`text-sm leading-6 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
        自动导演会参考「{selectedWorld.name}」这个世界样本，并在角色准备前整理可用于本书的世界约束。
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        className={`rounded-lg px-4 py-4 text-left transition ring-1 ${
          worldSetupMode === "auto_generate" ? activeCls : inactiveCls
        }`}
        onClick={() => onWorldSetupModeChange("auto_generate")}
      >
        <div className="text-sm font-medium">根据宏观规划生成本书世界</div>
        <div
          className={`mt-2 text-xs leading-5 ${
            worldSetupMode === "auto_generate" ? "text-background/70" : "text-muted-foreground"
          } ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}
        >
          适合奇幻、玄幻、科幻、悬疑等需要世界规则支撑的项目。
        </div>
      </button>
      <button
        type="button"
        className={`rounded-lg px-4 py-4 text-left transition ring-1 ${
          worldSetupMode === "skip" ? activeCls : inactiveCls
        }`}
        onClick={() => onWorldSetupModeChange("skip")}
      >
        <div className="text-sm font-medium">暂不使用世界观</div>
        <div
          className={`mt-2 text-xs leading-5 ${
            worldSetupMode === "skip" ? "text-background/70" : "text-muted-foreground"
          } ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}
        >
          适合现实题材、轻设定项目，角色和章节会主要依据书级规划推进。
        </div>
      </button>
    </div>
  );
}

// ── Style profile dropdown ──────────────────────────────────────────

export interface StageWorldStyleStyleProfileProps {
  selectedStyleProfileId: string;
  onStyleProfileChange: (value: string) => void;
  styleProfileOptions: Array<{ id: string; name: string }>;
  selectedStyleSummary: StyleIntentSummary | null;
  controlClassName: string;
  idPrefix?: string;
}

export function renderWorldStyleStyleProfile(props: StageWorldStyleStyleProfileProps): ReactNode {
  const {
    selectedStyleProfileId,
    onStyleProfileChange,
    styleProfileOptions,
    selectedStyleSummary,
    controlClassName,
    idPrefix = "ws-core-",
  } = props;

  return (
    <div className="space-y-2">
      <FieldLabel
        htmlFor={`${idPrefix}style-profile`}
        hint="可选。选定后，导演前半段会只读取轻量写法摘要，正文阶段再继续使用完整写法规则。"
      >
        书级默认写法
      </FieldLabel>
      <select
        id={`${idPrefix}style-profile`}
        className={controlClassName}
        value={selectedStyleProfileId}
        onChange={(event) => onStyleProfileChange(event.target.value)}
      >
        <option value="">先只用文风关键词</option>
        {styleProfileOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <div className={`text-xs leading-5 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
        {selectedStyleSummary?.stageSummaryLines[0] ?? "有沉淀好的写法资产时，建议直接选一套，帮助你更清楚地预期导演会怎样写。"}
      </div>
      {selectedStyleSummary?.stageSummaryLines.length ? (
        <div className={`pt-1 text-xs leading-6 text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
          这套写法会影响后续章节的语气和节奏：{selectedStyleSummary.stageSummaryLines.join("；")}
        </div>
      ) : null}
    </div>
  );
}
