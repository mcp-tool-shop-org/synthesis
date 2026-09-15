/**
 * Report Generator
 *
 * Outputs JSON report and console summary
 */

import { writeFileSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { dirname } from 'node:path';
import type { EvalReport, RelationalPosture } from './types.js';
import { CHECK_ORDER } from './runner.js';

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

/**
 * Write the full JSON report to disk atomically (temp file + rename).
 * On failure the temp file is unlinked and the error includes outputPath.
 */
export function writeReport(report: EvalReport, outputPath: string): void {
  const dir = dirname(outputPath);
  const tmpPath = `${outputPath}.tmp`;
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(tmpPath, JSON.stringify(report, null, 2), 'utf-8');
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

/**
 * Print a summary to the console (or a provided writer).
 * ANSI color is gated on `color` (defaults to stdout TTY).
 */
export function printSummary(
  report: EvalReport,
  write: SummaryWriter = console.log,
  color: boolean = Boolean(process.stdout?.isTTY)
): void {
  const { summary, failures } = report;
  const reset = color ? '\x1b[0m' : '';
  const red = color ? '\x1b[31m' : '';
  const green = color ? '\x1b[32m' : '';
  const yellow = color ? '\x1b[33m' : '';
  const cyan = color ? '\x1b[36m' : '';

  write('\n' + '═'.repeat(60));
  write('  SYNTHESIS - Empathy Evaluation Report');
  write('═'.repeat(60));

  // Overall stats (guard division-by-zero when there are no cases)
  const passRate = summary.cases > 0
    ? ((summary.passed / summary.cases) * 100).toFixed(1)
    : '0.0';
  const hasUnexpectedFailures = summary.unexpected_failures > 0;
  const passIcon = hasUnexpectedFailures ? '✗' : '✓';
  const passColor = hasUnexpectedFailures ? red : green;

  write(`\n  ${passColor}${passIcon}${reset} ${summary.passed}/${summary.cases} cases passed (${passRate}%)`);

  // Show expected vs unexpected failures (unexpected includes silent
  // negatives that passed — those do not increment summary.failed).
  if (summary.failed > 0 || hasUnexpectedFailures) {
    write(`    ${yellow}├${reset} Expected failures (negative examples): ${summary.expected_failures}`);
    write(`    ${hasUnexpectedFailures ? red : yellow}└${reset} Unexpected failures: ${summary.unexpected_failures}`);
  }

  // Label accuracy (if we have labels)
  if (summary.label_accuracy) {
    const accColor = summary.label_accuracy.accuracy >= 100 ? green : yellow;
    write(`\n  ${accColor}▸${reset} Label Accuracy: ${summary.label_accuracy.matched}/${summary.label_accuracy.total} (${summary.label_accuracy.accuracy}%)`);
  }

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
    // the absence of a positive — never a defect. Render it neutrally (never a red ✗) and
    // frame the count as "verified / assessed", not "passed / applicable".
    if (check === 'grounded_uptake') {
      write(`    ${cyan}▸${reset} ${checkName}: ${stats.passed} verified / ${applicable} assessed (${rate}%)${naNote}`);
      continue;
    }

    const icon = stats.failed === 0 ? '✓' : '✗';
    const checkColor = stats.failed === 0 ? green : yellow;
    write(`    ${checkColor}${icon}${reset} ${checkName}: ${stats.passed}/${applicable} (${rate}%)${naNote}`);
  }

  // Relational posture distribution (composed case-level summary)
  const postureCounts = new Map<RelationalPosture, number>();
  for (const r of report.results) {
    if (r.relational_posture) {
      const s = r.relational_posture.state;
      postureCounts.set(s, (postureCounts.get(s) ?? 0) + 1);
    }
  }
  if (postureCounts.size > 0) {
    const POSTURE_ICON: Record<RelationalPosture, string> = {
      grounded_uptake_verified: `${cyan}▸${reset}`,
      unresolved_abstain: `${yellow}◦${reset}`,
      hollow_warmth_flagged: `${yellow}✗${reset}`,
      pivot_or_abandonment: `${yellow}✗${reset}`,
      unsafe_comfort: `${red}✗${reset}`,
    };
    write('\n  Relational Posture:');
    for (const state of POSTURE_ORDER) {
      const n = postureCounts.get(state);
      if (!n) continue;
      const label = state.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      write(`    ${POSTURE_ICON[state]} ${label}: ${n}`);
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
      write(`    • ${failure.id}: ${checks}`);
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
      write(`    ✓ ${failure.id}: ${checks}`);
    }
    if (expectedFailures.length > 5) {
      write(`    ... and ${expectedFailures.length - 5} more`);
    }
  }

  write('\n' + '═'.repeat(60) + '\n');
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
  };
} {
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
        : undefined
    }
  };

  return artifact;
}
