import type {
  VolumeBeat,
  VolumeBeatSheet,
  VolumeChapterPlan,
  VolumePlan,
} from "@ai-novel/shared/types/novel";

export function parseBeatChapterSpan(chapterSpanHint: string): { start: number; end: number } | null {
  const matches = Array.from(chapterSpanHint.matchAll(/\d+/g), (match) => Number(match[0]));
  if (matches.length === 0 || matches.some((value) => Number.isNaN(value))) {
    return null;
  }
  const start = Math.max(1, matches[0]);
  const end = Math.max(start, matches[matches.length - 1]);
  return { start, end };
}

export function getBeatExpectedChapterCount(beat: Pick<VolumeBeat, "chapterSpanHint">): number {
  const span = parseBeatChapterSpan(beat.chapterSpanHint);
  if (!span) {
    return 0;
  }
  return Math.max(1, span.end - span.start + 1);
}

function buildLocalVolumeChapterOrderMap(volume: VolumePlan): Map<string, number> {
  return new Map(
    volume.chapters
      .slice()
      .sort((left, right) => left.chapterOrder - right.chapterOrder)
      .map((chapter, index) => [chapter.id, index + 1]),
  );
}

export function resolveVolumeChapterBeatKey(params: {
  chapter: VolumeChapterPlan;
  volume: VolumePlan;
  beatSheet: VolumeBeatSheet | null;
}): string | null {
  const normalizedBeatKey = params.chapter.beatKey?.trim();
  if (normalizedBeatKey) {
    return normalizedBeatKey;
  }
  if (!params.beatSheet) {
    return null;
  }
  const localOrderMap = buildLocalVolumeChapterOrderMap(params.volume);
  const localOrder = localOrderMap.get(params.chapter.id);
  if (!localOrder) {
    return null;
  }
  const matchedBeat = params.beatSheet.beats.find((beat) => {
    const span = parseBeatChapterSpan(beat.chapterSpanHint);
    return span ? localOrder >= span.start && localOrder <= span.end : false;
  });
  return matchedBeat?.key ?? null;
}
