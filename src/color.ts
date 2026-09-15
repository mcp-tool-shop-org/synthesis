/**
 * Color / ASCII-glyph gating for TTY output.
 *
 * Honors NO_COLOR (non-empty), FORCE_COLOR=0, NODE_DISABLE_COLORS, TERM=dumb,
 * and stream isTTY. FORCE_COLOR set to a non-zero value forces color even
 * without a TTY (unless NO_COLOR / FORCE_COLOR=0 / TERM=dumb already won).
 */

function envNonEmpty(name: string): boolean {
  const v = process.env[name];
  return v !== undefined && v !== '';
}

/**
 * Whether ANSI color should be emitted on `stream`.
 * CLI `--no-color` is applied by the caller on top of this.
 */
export function hasColors(stream: { isTTY?: boolean } = process.stdout): boolean {
  if (envNonEmpty('NO_COLOR')) return false;
  if (process.env.FORCE_COLOR === '0') return false;
  if (process.env.TERM === 'dumb') return false;
  if (envNonEmpty('NODE_DISABLE_COLORS')) {
    const fc = process.env.FORCE_COLOR;
    if (fc !== '1' && fc !== '2' && fc !== '3' && fc !== 'true') return false;
  }
  const fc = process.env.FORCE_COLOR;
  if (fc !== undefined && fc !== '' && fc !== '0' && fc !== 'false') return true;
  return Boolean(stream?.isTTY);
}

/**
 * ASCII glyphs for load/error paths: not a TTY, or NO_COLOR / FORCE_COLOR=0 / TERM=dumb.
 * FORCE_COLOR=1 does not keep Unicode on a non-TTY (pipes stay ASCII).
 */
export function useAsciiGlyphs(stream: { isTTY?: boolean } = process.stderr): boolean {
  if (envNonEmpty('NO_COLOR')) return true;
  if (process.env.FORCE_COLOR === '0') return true;
  if (process.env.TERM === 'dumb') return true;
  return !stream?.isTTY;
}
