export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

// Han (incl. extensions via the script property), Hiragana, Katakana, Hangul.
// Uses Unicode script escapes so supplementary-plane ideographs are covered without
// hand-listing surrogate ranges.
const CJK_LETTER_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

// Sentence-terminating marks that signal "this is a complete utterance" — the strongest
// cheap discriminator between real (often short) CJK prose/dialogue and short UI labels,
// which almost never carry terminal punctuation. Includes the full-width dash (――) that
// trailing-off dialogue uses.
const CJK_SENTENCE_TERMINATOR_PATTERN = /[。！？．…‥—―!?]/u;

// Code-point count rather than UTF-16 code-unit count, so supplementary-plane characters
// (rare ideographs, emoji) count as one rather than two.
export function countCodePoints(value: string): number {
  return [...value].length;
}

// Ratio of CJK letters among non-whitespace content characters. Full-width punctuation is
// intentionally excluded from the numerator so a symbol-only string like "――" is not
// treated as CJK content.
export function getCjkRatio(value: string): number {
  let total = 0;
  let cjk = 0;
  for (const character of value) {
    if (/\s/u.test(character)) {
      continue;
    }
    total += 1;
    if (CJK_LETTER_PATTERN.test(character)) {
      cjk += 1;
    }
  }
  return total === 0 ? 0 : cjk / total;
}

// A 0.3 threshold keeps "CJK with embedded Latin terms/numbers" (e.g. "React の useEffect")
// classified as CJK so it still gets the lower length minimum, while pure-symbol or
// pure-Latin strings stay out.
export function isCjkDominantText(value: string): boolean {
  return getCjkRatio(value) > 0.3;
}

export function hasCjkSentenceTerminator(value: string): boolean {
  return CJK_SENTENCE_TERMINATOR_PATTERN.test(value);
}
