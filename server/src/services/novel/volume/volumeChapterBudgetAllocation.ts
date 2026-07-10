import type { VolumePlan } from "@ai-novel/shared";
import type {
  VolumeGenerateOptions,
  VolumeGenerationNovel,
  VolumeWorkspace,
} from "./volumeModels";

export function deriveChapterBudget(params: {
  novel: VolumeGenerationNovel;
  workspace: VolumeWorkspace;
  options: VolumeGenerateOptions;
}): number {
  const { novel, workspace, options } = params;
  return Math.max(
    options.estimatedChapterCount ?? 0,
    novel.estimatedChapterCount ?? 0,
    workspace.volumes.flatMap((volume) => volume.chapters).length,
    12,
  );
}

function buildEvenChapterBudgets(input: {
  safeVolumeCount: number;
  minimumPerVolume: number;
  totalBudget: number;
}): number[] {
  const baseBudget = Math.floor(input.totalBudget / input.safeVolumeCount);
  let remainder = input.totalBudget - (baseBudget * input.safeVolumeCount);
  return Array.from({ length: input.safeVolumeCount }, () => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return Math.max(input.minimumPerVolume, baseBudget + extra);
  });
}

function shouldUseExistingVolumeWeights(existingCounts: number[], minimumPerVolume: number): boolean {
  return existingCounts.length > 0
    && existingCounts.every((count) => count >= minimumPerVolume);
}

export function allocateChapterBudgets(params: {
  volumeCount: number;
  chapterBudget: number;
  existingVolumes: VolumePlan[];
}): number[] {
  const { volumeCount, chapterBudget, existingVolumes } = params;
  const safeVolumeCount = Math.max(volumeCount, 1);
  const minimumPerVolume = 3;
  const totalBudget = Math.max(chapterBudget, safeVolumeCount * minimumPerVolume);

  // Respect manual targetChapterCount overrides
  const manualCounts = Array.from(
    { length: safeVolumeCount },
    (_, index) => existingVolumes[index]?.targetChapterCount ?? null,
  );
  const manualTotal = manualCounts.reduce<number>((sum, c) => sum + (c ?? 0), 0);
  const manualCount = manualCounts.filter((c): c is number => c != null).length;
  const autoVolumeCount = safeVolumeCount - manualCount;
  const autoBudget = Math.max(totalBudget - manualTotal, autoVolumeCount * minimumPerVolume);

  const existingCounts = Array.from(
    { length: safeVolumeCount },
    (_, index) => Math.max(existingVolumes[index]?.chapters.length ?? 0, 0),
  );

  let autoBudgets: number[];
  if (autoVolumeCount === 0) {
    autoBudgets = [];
  } else if (!shouldUseExistingVolumeWeights(
    existingCounts.filter((_, i) => manualCounts[i] == null),
    minimumPerVolume,
  )) {
    autoBudgets = buildEvenChapterBudgets({
      safeVolumeCount: autoVolumeCount,
      minimumPerVolume,
      totalBudget: autoBudget,
    });
  } else {
    const weights = existingCounts
      .map((count, i) => manualCounts[i] == null ? Math.max(count, 1) : 0)
      .filter((w) => w > 0);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    autoBudgets = weights.map((weight) => Math.max(
      minimumPerVolume,
      Math.round((autoBudget * weight) / totalWeight),
    ));
    let delta = autoBudget - autoBudgets.reduce((sum, budget) => sum + budget, 0);
    while (delta !== 0) {
      const direction = delta > 0 ? 1 : -1;
      for (let index = 0; index < autoBudgets.length && delta !== 0; index += 1) {
        if (direction < 0 && autoBudgets[index] <= minimumPerVolume) {
          continue;
        }
        autoBudgets[index] += direction;
        delta -= direction;
      }
    }
  }

  // Merge manual overrides with auto budgets
  let autoIndex = 0;
  return Array.from({ length: safeVolumeCount }, (_, i) => {
    if (manualCounts[i] != null) {
      return manualCounts[i]!;
    }
    return autoBudgets[autoIndex++] ?? minimumPerVolume;
  });
}
