/**
 * Shared raw-text helpers for the regex checkers.
 *
 * Apostrophe folding is applied to RAW checker input. Do not use normalize()
 * for this — it is token-only and strips punctuation, so the regex path would
 * still miss typographic apostrophes.
 *
 * Template-range collection clones each pattern with the g flag so shared
 * TEMPLATE_PATTERNS lastIndex is never mutated.
 */

/** Fold U+2018 / U+2019 / backtick to ASCII apostrophe. */
export function foldTypographicApostrophes(text: string): string {
  return text.replace(/[\u2018\u2019`]/g, "'");
}

export type CharRange = { start: number; end: number; text: string };

/**
 * Every match of every pattern, in pattern order then left-to-right.
 * Clones with /g; never exec()s the caller's regex.
 */
export function collectAllMatchRanges(
  text: string,
  patterns: readonly RegExp[]
): CharRange[] {
  const ranges: CharRange[] = [];
  for (const pattern of patterns) {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
    const re = new RegExp(pattern.source, flags);
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      if (m.index === undefined || m[0].length === 0) continue;
      ranges.push({ text: m[0], start: m.index, end: m.index + m[0].length });
    }
  }
  return ranges;
}

/** Merge overlapping (and touching) char ranges. */
export function unionCharRanges(
  ranges: ReadonlyArray<{ start: number; end: number }>
): Array<{ start: number; end: number }> {
  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
  return sorted.reduce<Array<{ start: number; end: number }>>((acc, r) => {
    const last = acc[acc.length - 1];
    if (last && r.start <= last.end) {
      last.end = Math.max(last.end, r.end);
    } else {
      acc.push({ start: r.start, end: r.end });
    }
    return acc;
  }, []);
}
