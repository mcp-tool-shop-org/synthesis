/**
 * Report Generator
 *
 * Outputs JSON report and console summary
 */

import { writeFileSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { dirname } from 'node:path';
import type { EvalReport, RelationalPosture, RelationalPostureResult } from './types.js';
import { CHECK_ORDER } from './runner.js';
import { computeRelationalPosture, NO_RELATIONAL_CHECK_POSTURE } from './relational.js';

/** Display order for the TTY posture block. A new RelationalPosture fails tsc until listed. */
export const POSTURE_ORDER = [
  'grounded_uptake_verified',
  'unresolved_abstain',
  'hollow_warmth_flagged',
  'pivot_or_abandonment',
  'unsafe_comfort',
] as const satisfies readonly RelationalPosture[];

type _AssertNever<T extends never> = T;
type _PostureOrderExhaustive = _AssertNever<Exclude<RelationalPosture, (typeof POSTURE_ORDER)[number]>>;
void 0 as _PostureOrderExhaustive;

/** Closed-model posture for JSON: never omit the key, even on a hand-built result. */
function postureForSerialize(result: EvalReport['results'][number]): RelationalPostureResult {
  if (result.relational_posture != null) return result.relational_posture;
  return computeRelationalPosture(result.checks) ?? NO_RELATIONAL_CHECK_POSTURE;
}

/**
 * Write the full JSON report to disk atomically (temp file + rename).
 * Root is the closed {summary, failures, results} object; every result includes
 * relational_posture. On failure the temp file is unlinked and the error includes outputPath.
 */
export function writeReport(report: EvalReport, outputPath: string): void {
  const dir = dirname(outputPath);
  const tmpPath = `${outputPath}.tmp`;
  try {
    mkdirSync(dir, { recursive: true });
    const payload = {
      summary: report.summary,
      failures: report.failures,
      results: report.results.map((r) => ({
        ...r,
        relational_posture: postureForSerialize(r),
      })),
    };
    writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf-8');
    renameSync(tmpPath, outputPath);
  } catch (err) {
    try {
      unlinkSync(tmpPath);
    } catch {
      // temp may not exist if mkdir/write failed first
    }
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to write report to ${outputPath}: ${detail}`, { cause: err });
  }
}

export type SummaryWriter = (...args: unknown[]) => void;

/** C2 contrastive foil — default TTY, not gated on --explain. */
export const SUMMARY_FOIL =
  'FAIL = checker fired; N/A = abstain (not a pass); verified_uptake = observable uptake (not sincerity/safety).';

export interface PrintSummaryOptions {
  /** Extra foil + per-case claims/non_claims. Limits still print when this is false. */
  explain?: boolean;
}

/** Hanging indent for wrapped foil / claims / non_claims continuation lines. */
const HANG_INDENT = '      ';

type SummaryGlyphs = {
  banner: string;
  tee: string;
  elbow: string;
  bullet: string;
  fail: string;
  pass: string;
  pointer: string;
  hollow: string;
  ellipsis: string;
};

function summaryGlyphs(color: boolean): SummaryGlyphs {
  if (color) {
    return {
      banner: '═',
      tee: '├',
      elbow: '└',
      bullet: '•',
      fail: '✗',
      pass: '✓',
      pointer: '▸',
      hollow: '◦',
      ellipsis: '…',
    };
  }
  return {
    banner: '=',
    tee: '+',
    elbow: '+',
    bullet: '*',
    fail: '[x]',
    pass: '[v]',
    pointer: '[>]',
    hollow: 'o',
    ellipsis: '...',
  };
}

/** Empty slice (n === 0) prints N/A, never a numeric 0 FPR. */
function formatSliceFpr(n: number | undefined, fpr: number | null | undefined): string {
  if (!n || fpr == null) return 'N/A';
  return String(fpr);
}

/** Banner/wrap width: min(60, stdout.columns || 80). */
export function summaryBannerWidth(columns: number | undefined = process.stdout?.columns): number {
  const cols = typeof columns === 'number' && Number.isFinite(columns) && columns > 0
    ? Math.floor(columns)
    : 80;
  return Math.min(60, cols);
}

function wrapPrefixed(
  prefix: string,
  body: string,
  width: number,
  hang: string,
  truncate: boolean,
  ellipsis: string
): string[] {
  const cap = Math.max(ellipsis.length + 1, width - 8);
  const fit = (line: string): string => {
    if (!truncate || line.length <= width) return line;
    return line.slice(0, cap) + ellipsis;
  };

  const words = body.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [fit(prefix.replace(/\s+$/u, ''))];

  const lines: string[] = [];
  let indent = prefix;
  let line = prefix;

  for (const word of words) {
    if (line === indent) {
      line = indent + word;
      continue;
    }
    if (line.length + 1 + word.length <= width) {
      line += ` ${word}`;
      continue;
    }
    lines.push(fit(line));
    indent = hang;
    line = hang + word;
  }
  lines.push(fit(line));
  return lines;
}

function writeWrapped(
  write: SummaryWriter,
  prefix: string,
  body: string,
  width: number,
  hang: string,
  truncate: boolean,
  ellipsis: string
): void {
  for (const line of wrapPrefixed(prefix, body, width, hang, truncate, ellipsis)) {
    write(line);
  }
}

/**
 * Print a summary to the console (or a provided writer).
 * ANSI color is gated on `color` (defaults to false — callers must opt in).
 * When color is false, box/emoji glyphs are ASCII. `explain` dumps per-case claims;
 * non_claims always print for postures that appeared.
 */
export function printSummary(
  report: EvalReport,
  write: SummaryWriter = console.log,
  color: boolean = false,
  options: PrintSummaryOptions = {}
): void {
  const { summary, failures } = report;
  const explain = options.explain === true;
  const reset = color ? '\x1b[0m' : '';
  const red = color ? '\x1b[31m' : '';
  const green = color ? '\x1b[32m' : '';
  const yellow = color ? '\x1b[33m' : '';
  const cyan = color ? '\x1b[36m' : '';
  const g = summaryGlyphs(color);
  const width = summaryBannerWidth();
  const bar = g.banner.repeat(width);

  write('\n' + bar);
  write('  SYNTHESIS - Empathy Evaluation Report');
  write(bar);
  for (const line of wrapPrefixed('  ', SUMMARY_FOIL, width, HANG_INDENT, false, g.ellipsis)) {
    write(`${yellow}${line}${reset}`);
  }
  if (explain) {
    write('  --explain dumps per-case claims/non_claims; limits also print on the default TTY.');
  }

  // Overall stats (guard division-by-zero when there are no cases)
  const passRate = summary.cases > 0
    ? ((summary.passed / summary.cases) * 100).toFixed(1)
    : '0.0';
  const hasUnexpectedFailures = summary.unexpected_failures > 0;
  const passIcon = hasUnexpectedFailures ? g.fail : g.pass;
  const passColor = hasUnexpectedFailures ? red : green;

  write(`\n  ${passColor}${passIcon}${reset} ${summary.passed}/${summary.cases} cases passed (${passRate}%)`);

  // Show expected vs unexpected failures (unexpected includes silent
  // negatives that passed — those do not increment summary.failed).
  if (summary.failed > 0 || hasUnexpectedFailures) {
    write(`    ${yellow}${g.tee}${reset} Expected failures (negative examples): ${summary.expected_failures}`);
    write(`    ${hasUnexpectedFailures ? red : yellow}${g.elbow}${reset} Unexpected failures: ${summary.unexpected_failures}`);
  }

  // Label accuracy (if we have labels)
  if (summary.label_accuracy) {
    const accColor = summary.label_accuracy.accuracy >= 100 ? green : yellow;
    write(`\n  ${accColor}${g.pointer}${reset} Label Accuracy: ${summary.label_accuracy.matched}/${summary.label_accuracy.total} (${summary.label_accuracy.accuracy}%)`);
  }

  // Fairness FPR columns — own fields, never mixed into label_accuracy.
  // Neutral glyphs: a 0 rate is not a quality score / "the product is good".
  write(`\n  ${cyan}${g.pointer}${reset} Fairness FPR (tagged genuine-care slices; not a quality score):`);
  write(`    n_brief_care: ${summary.n_brief_care ?? 0}  fpr_brief_care: ${formatSliceFpr(summary.n_brief_care, summary.fpr_brief_care)}`);
  write(`    n_dialect_like: ${summary.n_dialect_like ?? 0}  fpr_dialect_like: ${formatSliceFpr(summary.n_dialect_like, summary.fpr_dialect_like)}`);

  // Per-check breakdown — iterate shared CHECK_ORDER so a new CheckType cannot vanish from TTY
  write('\n  By Check:');

  for (const check of CHECK_ORDER) {
    const stats = summary.by_check[check];
    if (!stats) continue;

    const applicable = stats.passed + stats.failed;
    const rate = applicable > 0 ? ((stats.passed / applicable) * 100).toFixed(0) : '100';
    const checkName = check.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const naNote = stats.not_applicable > 0 ? ` [${stats.not_applicable} N/A]` : '';

    // grounded_uptake is a POSITIVE witness: "failed" here means no_verified_uptake, which is
    // the absence of a positive — never a defect. Render it neutrally (never a red fail glyph) and
    // frame the count as "verified / assessed", not "passed / applicable".
    if (check === 'grounded_uptake') {
      write(`    ${cyan}${g.pointer}${reset} ${checkName}: ${stats.passed} verified / ${applicable} assessed (${rate}%)${naNote}`);
      continue;
    }

    const icon = stats.failed === 0 ? g.pass : g.fail;
    const checkColor = stats.failed === 0 ? green : yellow;
    write(`    ${checkColor}${icon}${reset} ${checkName}: ${stats.passed}/${applicable} (${rate}%)${naNote}`);
  }

  // Relational posture distribution (composed case-level summary).
  // Default TTY prints unique non_claims + one example's claims per appeared state (C2).
  type PostureAgg = {
    count: number;
    nonClaims: Set<string>;
    exampleId: string;
    exampleClaims: string[];
  };
  const postureAggs = new Map<RelationalPosture, PostureAgg>();
  for (const r of report.results) {
    const p = r.relational_posture;
    if (!p) continue;
    const existing = postureAggs.get(p.state);
    if (existing) {
      existing.count += 1;
      for (const nc of p.non_claims) existing.nonClaims.add(nc);
    } else {
      postureAggs.set(p.state, {
        count: 1,
        nonClaims: new Set(p.non_claims),
        exampleId: r.id,
        exampleClaims: [...p.claims],
      });
    }
  }
  if (postureAggs.size > 0) {
    const POSTURE_ICON: Record<RelationalPosture, string> = {
      grounded_uptake_verified: `${cyan}${g.pointer}${reset}`,
      unresolved_abstain: `${yellow}${g.hollow}${reset}`,
      hollow_warmth_flagged: `${yellow}${g.fail}${reset}`,
      pivot_or_abandonment: `${yellow}${g.fail}${reset}`,
      unsafe_comfort: `${red}${g.fail}${reset}`,
    };
    write('\n  Relational Posture:');
    for (const state of POSTURE_ORDER) {
      const agg = postureAggs.get(state);
      if (!agg) continue;
      const label = state.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      write(`    ${POSTURE_ICON[state]} ${label}: ${agg.count}`);
      const nonClaims = [...agg.nonClaims];
      if (nonClaims.length > 0) {
        writeWrapped(write, '      non_claims: ', nonClaims.join('; '), width, HANG_INDENT, true, g.ellipsis);
      }
      if (agg.exampleClaims.length > 0) {
        writeWrapped(
          write,
          `      claims [${agg.exampleId}]: `,
          agg.exampleClaims.join('; '),
          width,
          HANG_INDENT,
          true,
          g.ellipsis
        );
      }
    }
    if (explain) {
      write('\n  Per-case relational_posture (--explain):');
      for (const r of report.results) {
        const p = r.relational_posture;
        if (!p) continue;
        write(`    ${g.bullet} ${r.id}: ${p.state}`);
        writeWrapped(
          write,
          '      claims: ',
          p.claims.length > 0 ? p.claims.join('; ') : '(none)',
          width,
          HANG_INDENT,
          true,
          g.ellipsis
        );
        writeWrapped(
          write,
          '      non_claims: ',
          p.non_claims.length > 0 ? p.non_claims.join('; ') : '(none)',
          width,
          HANG_INDENT,
          true,
          g.ellipsis
        );
      }
    }
  }

  // Failures detail (split by expected/unexpected)
  const unexpectedFailures = failures.filter(f => !f.expected_failure);
  const expectedFailures = failures.filter(f => f.expected_failure);

  if (unexpectedFailures.length > 0) {
    write(`\n  ${red}Unexpected Failures (regressions):${reset}`);
    for (const failure of unexpectedFailures.slice(0, 5)) {
      const failPart = failure.failed.join(', ');
      const passPart = failure.unexpected_pass && failure.unexpected_pass.length > 0
        ? `unexpected pass: ${failure.unexpected_pass.join(', ')}`
        : '';
      const checks = [failPart, passPart].filter(Boolean).join('; ') || 'unexpected pass';
      write(`    ${g.bullet} ${failure.id}: ${checks}`);
      printEvidence(failure.evidence, write);
    }
    if (unexpectedFailures.length > 5) {
      write(`    ... and ${unexpectedFailures.length - 5} more`);
    }
  }

  if (expectedFailures.length > 0) {
    write(`\n  ${yellow}Expected Failures (negative examples correctly caught):${reset}`);
    for (const failure of expectedFailures.slice(0, 5)) {
      const checks = failure.failed.join(', ');
      write(`    ${g.pass} ${failure.id}: ${checks}`);
    }
    if (expectedFailures.length > 5) {
      write(`    ... and ${expectedFailures.length - 5} more`);
    }
  }

  write('\n' + bar + '\n');
}

/**
 * Print evidence for a failure
 */
function printEvidence(evidence: Record<string, unknown>, write: SummaryWriter): void {
  for (const [key, value] of Object.entries(evidence)) {
    if (key === 'unexpected_pass') continue; // already rendered on the failure title line
    if (Array.isArray(value) && value.length > 0) {
      write(`      ${key}: ${value.slice(0, 3).join(', ')}${value.length > 3 ? '...' : ''}`);
    } else if (typeof value === 'number') {
      write(`      ${key}: ${value}`);
    } else if (typeof value === 'boolean') {
      write(`      ${key}: ${value}`);
    }
  }
}

/**
 * Format report for MCP-style artifact output
 */
export function formatArtifact(report: EvalReport, outputPath: string): {
  type: 'artifact';
  name: string;
  path: string;
  summary: {
    cases: number;
    passed: number;
    failed: number;
    expected_failures: number;
    unexpected_failures: number;
    pass_rate: string;
    label_accuracy?: string;
    n_brief_care: number;
    n_dialect_like: number;
    fpr_brief_care: number | null;
    fpr_dialect_like: number | null;
  };
} {
  const n_brief_care = report.summary.n_brief_care ?? 0;
  const n_dialect_like = report.summary.n_dialect_like ?? 0;
  const artifact = {
    type: 'artifact' as const,
    name: 'synthesis-report',
    path: outputPath,
    summary: {
      cases: report.summary.cases,
      passed: report.summary.passed,
      failed: report.summary.failed,
      expected_failures: report.summary.expected_failures,
      unexpected_failures: report.summary.unexpected_failures,
      pass_rate: `${report.summary.cases > 0
        ? ((report.summary.passed / report.summary.cases) * 100).toFixed(1)
        : '0.0'}%`,
      label_accuracy: report.summary.label_accuracy
        ? `${report.summary.label_accuracy.accuracy}%`
        : undefined,
      n_brief_care,
      n_dialect_like,
      // n=0 → null, never numeric 0. Do not present FPR as a quality badge.
      fpr_brief_care: n_brief_care === 0 ? null : (report.summary.fpr_brief_care ?? null),
      fpr_dialect_like: n_dialect_like === 0 ? null : (report.summary.fpr_dialect_like ?? null)
    }
  };

  return artifact;
}
