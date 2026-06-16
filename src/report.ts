/**
 * Report Generator
 *
 * Outputs JSON report and console summary
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { EvalReport, CheckType } from './types.js';

/**
 * Write the full JSON report to disk
 */
export function writeReport(report: EvalReport, outputPath: string): void {
  // Ensure output directory exists
  const dir = dirname(outputPath);
  mkdirSync(dir, { recursive: true });

  // Write formatted JSON
  writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf-8');
}

/**
 * Print a summary to the console
 */
export function printSummary(report: EvalReport): void {
  const { summary, failures } = report;

  console.log('\n' + '═'.repeat(60));
  console.log('  SYNTHESIS - Empathy Evaluation Report');
  console.log('═'.repeat(60));

  // Overall stats (guard division-by-zero when there are no cases)
  const passRate = summary.cases > 0
    ? ((summary.passed / summary.cases) * 100).toFixed(1)
    : '0.0';
  const hasUnexpectedFailures = summary.unexpected_failures > 0;
  const passIcon = hasUnexpectedFailures ? '✗' : '✓';
  const passColor = hasUnexpectedFailures ? '\x1b[31m' : '\x1b[32m';
  const reset = '\x1b[0m';
  const yellow = '\x1b[33m';

  console.log(`\n  ${passColor}${passIcon}${reset} ${summary.passed}/${summary.cases} cases passed (${passRate}%)`);

  // Show expected vs unexpected failures
  if (summary.failed > 0) {
    console.log(`    ${yellow}├${reset} Expected failures (negative examples): ${summary.expected_failures}`);
    console.log(`    ${hasUnexpectedFailures ? '\x1b[31m' : yellow}└${reset} Unexpected failures: ${summary.unexpected_failures}`);
  }

  // Label accuracy (if we have labels)
  if (summary.label_accuracy) {
    const accColor = summary.label_accuracy.accuracy >= 100 ? '\x1b[32m' : '\x1b[33m';
    console.log(`\n  ${accColor}▸${reset} Label Accuracy: ${summary.label_accuracy.matched}/${summary.label_accuracy.total} (${summary.label_accuracy.accuracy}%)`);
  }

  // Per-check breakdown
  console.log('\n  By Check:');
  const checkOrder: CheckType[] = ['agency_language', 'unverifiable_reassurance', 'topic_pivot', 'performative_empathy', 'grounded_uptake'];
  const cyan = '\x1b[36m';

  for (const check of checkOrder) {
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
      console.log(`    ${cyan}▸${reset} ${checkName}: ${stats.passed} verified / ${applicable} assessed (${rate}%)${naNote}`);
      continue;
    }

    const icon = stats.failed === 0 ? '✓' : '✗';
    const color = stats.failed === 0 ? '\x1b[32m' : '\x1b[33m';
    console.log(`    ${color}${icon}${reset} ${checkName}: ${stats.passed}/${applicable} (${rate}%)${naNote}`);
  }

  // Relational posture distribution (composed case-level summary)
  const postureCounts = new Map<string, number>();
  for (const r of report.results) {
    if (r.relational_posture) {
      const s = r.relational_posture.state;
      postureCounts.set(s, (postureCounts.get(s) ?? 0) + 1);
    }
  }
  if (postureCounts.size > 0) {
    const POSTURE_ORDER = [
      'grounded_uptake_verified',
      'unresolved_abstain',
      'hollow_warmth_flagged',
      'pivot_or_abandonment',
      'unsafe_comfort',
    ];
    const POSTURE_ICON: Record<string, string> = {
      grounded_uptake_verified: `${cyan}▸${reset}`,
      unresolved_abstain: `${yellow}◦${reset}`,
      hollow_warmth_flagged: `${yellow}✗${reset}`,
      pivot_or_abandonment: `${yellow}✗${reset}`,
      unsafe_comfort: `${'\x1b[31m'}✗${reset}`,
    };
    console.log('\n  Relational Posture:');
    for (const state of POSTURE_ORDER) {
      const n = postureCounts.get(state);
      if (!n) continue;
      const label = state.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      console.log(`    ${POSTURE_ICON[state] ?? '•'} ${label}: ${n}`);
    }
  }

  // Failures detail (split by expected/unexpected)
  const unexpectedFailures = failures.filter(f => !f.expected_failure);
  const expectedFailures = failures.filter(f => f.expected_failure);

  if (unexpectedFailures.length > 0) {
    console.log(`\n  ${'\x1b[31m'}Unexpected Failures (regressions):${reset}`);
    for (const failure of unexpectedFailures.slice(0, 5)) {
      const checks = failure.failed.join(', ');
      console.log(`    • ${failure.id}: ${checks}`);
      printEvidence(failure.evidence);
    }
    if (unexpectedFailures.length > 5) {
      console.log(`    ... and ${unexpectedFailures.length - 5} more`);
    }
  }

  if (expectedFailures.length > 0) {
    console.log(`\n  ${yellow}Expected Failures (negative examples correctly caught):${reset}`);
    for (const failure of expectedFailures.slice(0, 5)) {
      const checks = failure.failed.join(', ');
      console.log(`    ✓ ${failure.id}: ${checks}`);
    }
    if (expectedFailures.length > 5) {
      console.log(`    ... and ${expectedFailures.length - 5} more`);
    }
  }

  console.log('\n' + '═'.repeat(60) + '\n');
}

/**
 * Print evidence for a failure
 */
function printEvidence(evidence: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(evidence)) {
    if (Array.isArray(value) && value.length > 0) {
      console.log(`      ${key}: ${value.slice(0, 3).join(', ')}${value.length > 3 ? '...' : ''}`);
    } else if (typeof value === 'number') {
      console.log(`      ${key}: ${value}`);
    } else if (typeof value === 'boolean') {
      console.log(`      ${key}: ${value}`);
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
