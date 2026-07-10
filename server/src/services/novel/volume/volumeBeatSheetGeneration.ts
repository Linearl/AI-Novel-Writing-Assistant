import type { VolumeBeat, VolumePlanDocument } from "@ai-novel/shared";
import { runStructuredPrompt } from "../../../prompting/core/promptRunner";
import { volumeBeatSheetPrompt } from "../../../prompting/prompts/novel/volume/beatSheet.prompts";
import { buildVolumeBeatSheetContextBlocks } from "../../../prompting/prompts/novel/volume/contextBlocks";
import type { StoryMacroPlanService } from "../storyMacro/StoryMacroPlanService";
import {
  allocateChapterBudgets,
  deriveChapterBudget,
} from "./volumeChapterBudgetAllocation";
import {
  getTargetVolume,
  mergeBeatSheet,
} from "./volumeGenerationHelpers";
import type {
  VolumeGenerateOptions,
  VolumeGenerationPhase,
  VolumeGenerationNovel,
  VolumeWorkspace,
} from "./volumeModels";

type StoryMacroPlanResult = Awaited<ReturnType<StoryMacroPlanService["getPlan"]>> | null;

/** Lightweight beat sheet shape used by the validator (avoids coupling to full VolumeBeatSheet). */
interface BeatSheetLike {
  beats: ReadonlyArray<Readonly<Pick<VolumeBeat, "key" | "label" | "chapterSpanHint">>>;
}

/** Parse the chapter count from a chapterSpanHint string like "1-3章" or "5章". */
function parseChapterCount(hint: string): number | null {
  const rangeMatch = hint.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) {
    const end = parseInt(rangeMatch[2], 10);
    const start = parseInt(rangeMatch[1], 10);
    return Number.isFinite(start) && Number.isFinite(end) ? (end - start + 1) : null;
  }
  const singleMatch = hint.match(/(\d+)\s*章/);
  if (singleMatch) {
    const n = parseInt(singleMatch[1], 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Validate that a regenerated beat sheet preserves the structure of the original.
 *
 * Checks:
 * - Beat count match
 * - Key existence (case-insensitive) — no missing or unexpected keys
 * - Key positional order
 * - Chapter count per beat within configurable tolerance (default ±1)
 */
export function validateBeatStructurePreservation(
  original: BeatSheetLike,
  regenerated: BeatSheetLike,
  chapterTolerance = 1,
): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  // If either side has no beats, nothing to validate
  if (original.beats.length === 0 || regenerated.beats.length === 0) {
    return { valid: true, violations };
  }

  // 1. Beat count match
  if (original.beats.length !== regenerated.beats.length) {
    violations.push(
      `beat count mismatch: original has ${original.beats.length}, regenerated has ${regenerated.beats.length}`,
    );
  }

  // 2. Key existence (case-insensitive)
  const originalKeysLower = new Map(
    original.beats.map((b, i) => [b.key.toLowerCase(), { key: b.key, index: i }]),
  );
  const regeneratedKeysLower = new Map(
    regenerated.beats.map((b, i) => [b.key.toLowerCase(), { key: b.key, index: i }]),
  );

  const missingKeys: string[] = [];
  for (const [keyLower, originalEntry] of originalKeysLower) {
    if (!regeneratedKeysLower.has(keyLower)) {
      missingKeys.push(originalEntry.key);
    }
  }
  if (missingKeys.length > 0) {
    violations.push(`missing keys in regenerated beat sheet: ${missingKeys.join(", ")}`);
  }

  const unexpectedKeys: string[] = [];
  for (const [keyLower, regeneratedEntry] of regeneratedKeysLower) {
    if (!originalKeysLower.has(keyLower)) {
      unexpectedKeys.push(regeneratedEntry.key);
    }
  }
  if (unexpectedKeys.length > 0) {
    violations.push(`unexpected new keys in regenerated beat sheet: ${unexpectedKeys.join(", ")}`);
  }

  // 3. Key positional order — compare order of shared keys
  const sharedOriginalOrder = original.beats
    .filter((b) => regeneratedKeysLower.has(b.key.toLowerCase()))
    .map((b) => b.key.toLowerCase());
  const sharedRegeneratedOrder = regenerated.beats
    .filter((b) => originalKeysLower.has(b.key.toLowerCase()))
    .map((b) => b.key.toLowerCase());

  if (sharedOriginalOrder.length > 1 && sharedOriginalOrder.length === sharedRegeneratedOrder.length) {
    // Compare the relative ordering
    for (let i = 0; i < sharedOriginalOrder.length; i++) {
      for (let j = i + 1; j < sharedOriginalOrder.length; j++) {
        const posI = sharedRegeneratedOrder.indexOf(sharedOriginalOrder[i]);
        const posJ = sharedRegeneratedOrder.indexOf(sharedOriginalOrder[j]);
        if (posI > posJ) {
          violations.push(`key position mismatch: "${sharedOriginalOrder[i]}" should appear before "${sharedOriginalOrder[j]}"`);
          // Break early to avoid duplicate violations
          i = sharedOriginalOrder.length;
          break;
        }
      }
    }
  }

  // 4. Chapter count per beat within tolerance
  for (const origBeat of original.beats) {
    const regBeat = regenerated.beats.find(
      (b) => b.key.toLowerCase() === origBeat.key.toLowerCase(),
    );
    if (!regBeat) continue;

    const origCount = parseChapterCount(origBeat.chapterSpanHint);
    const regCount = parseChapterCount(regBeat.chapterSpanHint);
    if (origCount !== null && regCount !== null) {
      const diff = Math.abs(regCount - origCount);
      if (diff > chapterTolerance) {
        violations.push(
          `beat "${origBeat.key}" chapter count ${regCount} differs from original ${origCount} (diff ${diff} exceeds tolerance ${chapterTolerance})`,
        );
      }
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}

export function resolveBeatSheetTargetChapterCount(input: {
  targetVolumeChapterCount: number;
  targetVolumeIndex: number;
  volumeCount: number;
  chapterBudget: number;
  chapterBudgets: number[];
}): number {
  const fallbackTargetChapterCount = input.chapterBudgets[input.targetVolumeIndex]
    ?? Math.max(3, Math.round(input.chapterBudget / Math.max(input.volumeCount, 1)));
  return Math.max(input.targetVolumeChapterCount, fallbackTargetChapterCount);
}

export async function generateBeatSheet(params: {
  document: VolumePlanDocument;
  novel: VolumeGenerationNovel;
  workspace: VolumeWorkspace;
  storyMacroPlan: StoryMacroPlanResult;
  options: VolumeGenerateOptions;
  notifyVolumeGenerationPhase: (input: {
    novelId: string;
    scope: "beat_sheet";
    phase: VolumeGenerationPhase;
    label: string;
    options: VolumeGenerateOptions;
  }) => Promise<void>;
}): Promise<VolumePlanDocument> {
  const { document, novel, workspace, storyMacroPlan, options } = params;
  const targetVolume = getTargetVolume(document, options.targetVolumeId);
  const chapterBudget = deriveChapterBudget({ novel, workspace, options });
  const chapterBudgets = allocateChapterBudgets({
    volumeCount: Math.max(document.volumes.length, 1),
    chapterBudget,
    existingVolumes: document.volumes,
  });
  const targetIndex = document.volumes.findIndex((volume) => volume.id === targetVolume.id);
  const targetChapterCount = resolveBeatSheetTargetChapterCount({
    targetVolumeChapterCount: targetVolume.chapters.length,
    targetVolumeIndex: targetIndex,
    volumeCount: document.volumes.length,
    chapterBudget,
    chapterBudgets,
  });
  await params.notifyVolumeGenerationPhase({
    novelId: document.novelId,
    scope: "beat_sheet",
    phase: "prompt",
    label: `正在生成第 ${targetVolume.sortOrder} 卷节奏板`,
    options,
  });
  const promptInput = {
    novel,
    workspace,
    storyMacroPlan,
    strategyPlan: document.strategyPlan,
    targetVolume,
    targetChapterCount,
    guidance: options.guidance,
    referenceExisting: options.referenceExisting,
  };
  const generated = await runStructuredPrompt({
    asset: volumeBeatSheetPrompt,
    promptInput,
    contextBlocks: buildVolumeBeatSheetContextBlocks(promptInput, {
      referenceExisting: options.referenceExisting,
    }),
    options: {
      provider: options.provider,
      model: options.model,
      temperature: options.temperature ?? 0.35,
      novelId: document.novelId,
      volumeId: targetVolume.id,
      taskId: options.taskId,
      stage: "structured_outline",
      itemKey: "beat_sheet",
      scope: "beat_sheet",
      entrypoint: options.entrypoint,
      signal: options.signal,
    },
  });

  // Structural preservation validation and retry when regenerating existing beat sheet
  if (options.referenceExisting) {
    const existingBeatSheet = workspace.beatSheets?.find(
      (bs) => bs.volumeId === targetVolume.id,
    );
    if (existingBeatSheet && existingBeatSheet.beats.length > 0) {
      const validation = validateBeatStructurePreservation(
        existingBeatSheet,
        { beats: generated.output.beats },
      );
      if (!validation.valid) {
        // Retry once with violation details in guidance
        const retryGuidance = [
          options.guidance,
          "\n\n【结构保持约束】",
          "你是重新生成节奏板，必须保持原版节奏板的骨架结构。以下是违规项：",
          ...validation.violations.map((v) => `- ${v}`),
          "请严格保持原有的 key、顺序和章节跨度。",
        ].filter(Boolean).join("\n");

        const retryPromptInput = {
          ...promptInput,
          guidance: retryGuidance,
        };
        const retryGenerated = await runStructuredPrompt({
          asset: volumeBeatSheetPrompt,
          promptInput: retryPromptInput,
          contextBlocks: buildVolumeBeatSheetContextBlocks(retryPromptInput, {
            referenceExisting: options.referenceExisting,
          }),
          options: {
            provider: options.provider,
            model: options.model,
            temperature: options.temperature ?? 0.35,
            novelId: document.novelId,
            volumeId: targetVolume.id,
            taskId: options.taskId,
            stage: "structured_outline",
            itemKey: "beat_sheet",
            scope: "beat_sheet",
            entrypoint: options.entrypoint,
            signal: options.signal,
          },
        });

        const retryValidation = validateBeatStructurePreservation(
          existingBeatSheet,
          { beats: retryGenerated.output.beats },
        );
        // If retry still fails, return first output with original beats (best-effort)
        if (!retryValidation.valid) {
          return mergeBeatSheet(document, targetVolume, generated.output.beats);
        }
        return mergeBeatSheet(document, targetVolume, retryGenerated.output.beats);
      }
    }
  }

  return mergeBeatSheet(document, targetVolume, generated.output.beats);
}
