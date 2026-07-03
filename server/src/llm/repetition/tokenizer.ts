/**
 * CJK-aware tokenizer for repetition detection.
 *
 * Strategy:
 * - Each CJK character is its own token (characters are meaningful units).
 * - Latin text is split on whitespace / punctuation boundaries.
 * - Mixed runs keep CJK characters individual while grouping adjacent Latin tokens.
 */

const CJK_RANGE =
  /[⺀-⻿⼀-⿟぀-ゟ゠-ヿ㄀-ㄯ㄰-㆏㈀-㋿㐀-䶿一-鿿豈-﫿︰-﹏\u{20000}-\u{2A6DF}\u{2A700}-\u{2B73F}\u{2B740}-\u{2B81F}\u{2B820}-\u{2CEAF}\u{2CEB0}-\u{2EBEF}\u{30000}-\u{3134F}]/u;

const HANGUL_RANGE =
  /[가-힯ᄀ-ᇿ㄰-㆏]/u;

// CJK punctuation and fullwidth forms (U+3000-U+303F, U+FF00-U+FFEF)
const CJK_PUNCT_RANGE =
  /[\u{3000}-\u{303F}\u{FF00}-\u{FFEF}]/u;

const PUNCTUATION = /[!-/:-@[-`{-~\s]+/;

function isCjk(char: string): boolean {
  return CJK_RANGE.test(char) || HANGUL_RANGE.test(char) || CJK_PUNCT_RANGE.test(char);
}

/**
 * Tokenize a string for ngram-based repetition detection.
 *
 * CJK characters are individually tokenized.  Latin text is grouped into
 * whitespace/punctuation-delimited tokens.  The result is a flat array of
 * string tokens preserving document order.
 */
export function tokenizeForNgram(text: string): string[] {
  if (!text) return [];

  const tokens: string[] = [];
  let latinBuffer = "";

  for (const char of text) {
    if (isCjk(char)) {
      if (latinBuffer) {
        tokens.push(latinBuffer);
        latinBuffer = "";
      }
      tokens.push(char);
    } else {
      latinBuffer += char;
    }
  }

  if (latinBuffer) {
    tokens.push(latinBuffer);
  }

  // Further split each Latin buffer segment by punctuation / whitespace so
  // each token is a meaningful word-level chunk rather than an entire
  // paragraph run.
  const expanded: string[] = [];
  for (const tok of tokens) {
    if (isCjk(tok[0] ?? "")) {
      expanded.push(tok);
      continue;
    }
    const parts = tok.split(PUNCTUATION).filter(Boolean);
    expanded.push(...parts);
  }

  return expanded;
}
