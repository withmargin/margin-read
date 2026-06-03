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

// CJK dialogue is wrapped in corner brackets (「」『』) or angle/lenticular brackets. A line
// fully enclosed in them is quoted speech — a complete utterance even when very short and
// unterminated (e.g. 「ちぇー」). UI labels are essentially never bracket-enclosed.
const CJK_QUOTE_OPEN_PATTERN = /^[「『〈《【〔（]/u;
const CJK_QUOTE_CLOSE_PATTERN = /[」』〉》】〕）]$/u;

// Any letter (used as the ratio denominator). Punctuation, digits and symbols are excluded
// so a mostly-punctuation line like 「……え？」 is still judged by its lone kana, not diluted.
const LETTER_PATTERN = /\p{L}/u;

// Code-point count rather than UTF-16 code-unit count, so supplementary-plane characters
// (rare ideographs, emoji) count as one rather than two.
export function countCodePoints(value: string): number {
  return [...value].length;
}

// Fraction of letters that are CJK. The denominator counts only letters (not punctuation,
// digits or symbols) so a heavily-punctuated line such as 「……え？」 reads as 1/1 CJK rather
// than being diluted to a low ratio, while a symbol-only string like "――" has no letters
// and is not treated as CJK content.
export function getCjkRatio(value: string): number {
  let letters = 0;
  let cjk = 0;
  for (const character of value) {
    if (!LETTER_PATTERN.test(character)) {
      continue;
    }
    letters += 1;
    if (CJK_LETTER_PATTERN.test(character)) {
      cjk += 1;
    }
  }
  return letters === 0 ? 0 : cjk / letters;
}

// A 0.3 threshold keeps "CJK with embedded Latin terms" (e.g. "Reactは便利な道具だ") classified
// as CJK so it still gets the lower length minimum, while Latin-dominant, pure-symbol or
// pure-numeric strings stay out.
export function isCjkDominantText(value: string): boolean {
  return getCjkRatio(value) > 0.3;
}

export function hasCjkSentenceTerminator(value: string): boolean {
  return CJK_SENTENCE_TERMINATOR_PATTERN.test(value);
}

// True when the (trimmed) text is fully enclosed in CJK quotation/bracket pairs — a strong
// signal of quoted dialogue, treated as a complete utterance for length gating.
export function isCjkQuotedText(value: string): boolean {
  const trimmed = value.trim();
  return CJK_QUOTE_OPEN_PATTERN.test(trimmed) && CJK_QUOTE_CLOSE_PATTERN.test(trimmed);
}
