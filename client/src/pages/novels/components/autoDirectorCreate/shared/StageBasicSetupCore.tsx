/**
 * REQ-3022: Shared Core for StageBasicSetup — extracts the 5 basic form fields
 * (reader channel, POV, pace, emotion, chapter count) and the supplementary
 * reader/selling-point framing fields.
 *
 * Used by:
 * - autoDirector/StageBasicSetup.tsx (fullscreen layout)
 * - autoDirectorCreate/StageBasicSetup.tsx (compact/dialog layout)
 */
import type { ReactNode } from "react";
import type { NovelBasicFormState } from "../../../novelBasicInfo.shared";
import {
  BASIC_INFO_FIELD_HINTS,
  DEFAULT_ESTIMATED_CHAPTER_COUNT,
  EMOTION_OPTIONS,
  PACE_OPTIONS,
  POV_OPTIONS,
  READER_CHANNEL_OPTIONS,
} from "../../../novelBasicInfo.shared";
import { FieldLabel, findOptionSummary } from "../../basicInfoForm/BasicInfoFormPrimitives";
import { BookFramingQuickFillButton } from "../../basicInfoForm/BookFramingQuickFillButton";
import { Input } from "@/components/ui/input";
import { AUTO_DIRECTOR_MOBILE_CLASSES } from "@/mobile/autoDirector";

export interface StageBasicSetupCoreFieldsProps {
  basicForm: NovelBasicFormState;
  onBasicFormChange: (patch: Partial<NovelBasicFormState>) => void;
  /** CSS class for form controls (select, input, textarea). */
  controlClassName: string;
  /** Prefix for form field ids (e.g. "director-basic-" or "stage-basic-"). */
  idPrefix?: string;
}

/**
 * Renders the 5 core basic setup fields: reader channel, POV, pace, emotion
 * intensity, and estimated chapter count (with large-chapter warning).
 */
export function renderBasicSetupCoreFields(props: StageBasicSetupCoreFieldsProps): ReactNode {
  const { basicForm, onBasicFormChange, controlClassName, idPrefix = "bs-core-" } = props;
  const hasLargeChapterPlan = basicForm.estimatedChapterCount > 200;

  return (
    <>
      <div className="space-y-2">
        <FieldLabel htmlFor={`${idPrefix}reader-channel`} hint={BASIC_INFO_FIELD_HINTS.readerChannelPreference}>
          读者频道倾向
        </FieldLabel>
        <select
          id={`${idPrefix}reader-channel`}
          className={controlClassName}
          value={basicForm.readerChannelPreference}
          onChange={(event) =>
            onBasicFormChange({
              readerChannelPreference: event.target.value as NovelBasicFormState["readerChannelPreference"],
            })
          }
        >
          {READER_CHANNEL_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
          {findOptionSummary(READER_CHANNEL_OPTIONS, basicForm.readerChannelPreference)}
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor={`${idPrefix}pov`} hint={BASIC_INFO_FIELD_HINTS.narrativePov}>
          叙事视角
        </FieldLabel>
        <select
          id={`${idPrefix}pov`}
          className={controlClassName}
          value={basicForm.narrativePov}
          onChange={(event) =>
            onBasicFormChange({
              narrativePov: event.target.value as NovelBasicFormState["narrativePov"],
            })
          }
        >
          {POV_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
          {findOptionSummary(POV_OPTIONS, basicForm.narrativePov)}
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor={`${idPrefix}pace`} hint={BASIC_INFO_FIELD_HINTS.pacePreference}>
          节奏偏好
        </FieldLabel>
        <select
          id={`${idPrefix}pace`}
          className={controlClassName}
          value={basicForm.pacePreference}
          onChange={(event) =>
            onBasicFormChange({
              pacePreference: event.target.value as NovelBasicFormState["pacePreference"],
            })
          }
        >
          {PACE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
          {findOptionSummary(PACE_OPTIONS, basicForm.pacePreference)}
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor={`${idPrefix}emotion`} hint={BASIC_INFO_FIELD_HINTS.emotionIntensity}>
          情绪浓度
        </FieldLabel>
        <select
          id={`${idPrefix}emotion`}
          className={controlClassName}
          value={basicForm.emotionIntensity}
          onChange={(event) =>
            onBasicFormChange({
              emotionIntensity: event.target.value as NovelBasicFormState["emotionIntensity"],
            })
          }
        >
          {EMOTION_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
          {findOptionSummary(EMOTION_OPTIONS, basicForm.emotionIntensity)}
        </div>
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor={`${idPrefix}estimated`} hint={BASIC_INFO_FIELD_HINTS.estimatedChapterCount}>
          预计章节数
        </FieldLabel>
        <Input
          id={`${idPrefix}estimated`}
          type="number"
          min={1}
          max={2000}
          className={controlClassName}
          value={basicForm.estimatedChapterCount}
          onChange={(event) =>
            onBasicFormChange({
              estimatedChapterCount: Math.max(
                1,
                Math.min(2000, Number(event.target.value || 0) || DEFAULT_ESTIMATED_CHAPTER_COUNT),
              ),
            })
          }
        />
        <div className={`text-xs text-muted-foreground ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}>
          会作为整书结构密度和后续卷章规划的参考，不是硬性上限。
        </div>
        {hasLargeChapterPlan ? (
          <div
            className={`rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 ${AUTO_DIRECTOR_MOBILE_CLASSES.wrapText}`}
          >
            建议先小范围尝试：先查看规划和前期章节方向，确认符合想法后再扩大产出范围。
          </div>
        ) : null}
      </div>
    </>
  );
}

export interface StageBasicSetupFramingFieldsProps {
  basicForm: NovelBasicFormState;
  onBasicFormChange: (patch: Partial<NovelBasicFormState>) => void;
  genreOptions: Array<{ id: string; path: string; label: string }>;
  idea: string;
  controlClassName: string;
  /** Prefix for form field ids. */
  idPrefix?: string;
}

/**
 * Renders the supplementary reader/selling-point framing fields:
 * target audience, commercial tags, competing feel, book selling point,
 * first-30-chapter promise, plus the BookFramingQuickFillButton.
 */
export function renderBasicSetupFramingFields(props: StageBasicSetupFramingFieldsProps): ReactNode {
  const { basicForm, onBasicFormChange, genreOptions, idea, controlClassName, idPrefix = "bs-core-" } = props;

  return (
    <>
      <div className="flex justify-start">
        <BookFramingQuickFillButton
          basicForm={basicForm}
          genreOptions={genreOptions}
          descriptionOverride={idea}
          onApplySuggestion={onBasicFormChange}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor={`${idPrefix}target-audience`} hint={BASIC_INFO_FIELD_HINTS.targetAudience}>
          目标读者
        </FieldLabel>
        <Input
          id={`${idPrefix}target-audience`}
          className={controlClassName}
          value={basicForm.targetAudience}
          placeholder="例如：爱看都市高压逆袭、关系拉扯和持续追更钩子的读者"
          onChange={(event) => onBasicFormChange({ targetAudience: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor={`${idPrefix}commercial-tags`} hint={BASIC_INFO_FIELD_HINTS.commercialTagsText}>
          核心商业标签
        </FieldLabel>
        <Input
          id={`${idPrefix}commercial-tags`}
          className={controlClassName}
          value={basicForm.commercialTagsText}
          placeholder="例如：逆袭，强冲突，悬念拉满，职场博弈"
          onChange={(event) => onBasicFormChange({ commercialTagsText: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor={`${idPrefix}competing-feel`} hint={BASIC_INFO_FIELD_HINTS.competingFeel}>
          竞品感 / 熟悉阅读感
        </FieldLabel>
        <Input
          id={`${idPrefix}competing-feel`}
          className={controlClassName}
          value={basicForm.competingFeel}
          placeholder="例如：现实职场压迫感里带一点冷幽默和高密度关系拉扯"
          onChange={(event) => onBasicFormChange({ competingFeel: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor={`${idPrefix}book-selling-point`} hint={BASIC_INFO_FIELD_HINTS.bookSellingPoint}>
          本书核心卖点
        </FieldLabel>
        <textarea
          id={`${idPrefix}book-selling-point`}
          rows={3}
          className={`${controlClassName} min-h-[96px] resize-y`}
          value={basicForm.bookSellingPoint}
          placeholder="例如：主角每次解决现实困局都会撬动更大的关系链和利益链，读者会一直期待下一次反压。"
          onChange={(event) => onBasicFormChange({ bookSellingPoint: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <FieldLabel htmlFor={`${idPrefix}first30-promise`} hint={BASIC_INFO_FIELD_HINTS.first30ChapterPromise}>
          前 30 章承诺
        </FieldLabel>
        <textarea
          id={`${idPrefix}first30-promise`}
          rows={4}
          className={`${controlClassName} min-h-[120px] resize-y`}
          value={basicForm.first30ChapterPromise}
          placeholder="例如：前 30 章必须让读者看到主角站稳第一阶段立场、核心对手浮出水面、关系线第一次强反转，并明确这本书后面会越写越狠。"
          onChange={(event) => onBasicFormChange({ first30ChapterPromise: event.target.value })}
        />
      </div>
    </>
  );
}
