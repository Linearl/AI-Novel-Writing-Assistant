/**
 * Outline TXT serializer — serialises / deserialises structured outline
 * to the `章节标题-----章节摘要` line format.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Mirrors the shape from novel/structuredOutline without importing the module directly. */
export interface StructuredOutlineChapter {
  chapter: number;
  title: string;
  summary: string;
  key_events: string[];
  roles: string[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SEPARATOR = "-----";

/* ------------------------------------------------------------------ */
/*  Export                                                             */
/* ------------------------------------------------------------------ */

export interface OutlineChapterSummary {
  title: string;
  summary: string;
}

/**
 * Serialise outline chapters to TXT.
 * Escapes `-----` inside titles/summaries to `- - - - -` on export.
 */
export function serializeOutlineTxt(chapters: OutlineChapterSummary[]): string {
  if (chapters.length === 0) {
    return "";
  }
  const lines = chapters.map((ch) => {
    const safeTitle = ch.title.replace(/-----/g, "- - - - -");
    const safeSummary = ch.summary.replace(/-----/g, "- - - - -");
    return `${safeTitle}${SEPARATOR}${safeSummary}`;
  });
  return lines.join("\n") + "\n";
}

/* ------------------------------------------------------------------ */
/*  Import                                                             */
/* ------------------------------------------------------------------ */

export interface ParsedOutlineChapter {
  title: string;
  summary: string;
}

/**
 * Parse TXT lines into outline chapter entries.
 * Each non-empty line must contain `-----`.
 */
export function parseOutlineTxt(lines: string[]): ParsedOutlineChapter[] {
  const chapters: ParsedOutlineChapter[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const idx = line.indexOf(SEPARATOR);
    if (idx < 0) {
      throw new Error(`格式错误`);
    }
    const title = line.slice(0, idx).trim();
    const summary = line.slice(idx + SEPARATOR.length).trim();
    if (!title) {
      throw new Error(`格式错误`);
    }
    chapters.push({ title, summary });
  }
  return chapters;
}

/**
 * Convert parsed chapters into the StructuredOutlineChapter shape
 * for persisting into Novel.structuredOutline.
 * Assigns sequential chapter numbers starting from 1 (or an offset).
 */
export function toStructuredOutlineChapters(
  parsed: ParsedOutlineChapter[],
  startChapter: number,
): StructuredOutlineChapter[] {
  return parsed.map((item, i) => ({
    chapter: startChapter + i,
    title: item.title,
    summary: item.summary,
    key_events: [],
    roles: [],
  }));
}
