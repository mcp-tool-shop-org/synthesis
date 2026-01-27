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

  // Overall stats
  const passRate = ((summary.passed / summary.cases) * 100).toFixed(1);
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
  const checkOrder: CheckType[] = ['agency_language', 'unverifiable_reassurance', 'topic_pivot'];

  for (const check of checkOrder) {
    const stats = summary.by_check[check];
    if (!stats) continue;

    const applicable = stats.passed + stats.failed;
    const total = applicable + stats.not_applicable;
    const rate = applicable > 0 ? ((stats.passed / applicable) * 100).toFixed(0) : '100';
    const icon = stats.failed === 0 ? '✓' : '✗';
    const color = stats.failed === 0 ? '\x1b[32m' : '\x1b[33m';

    const checkName = check.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // Show N/A count if relevant
    const naNote = stats.not_applicable > 0 ? ` [${stats.not_applicable} N/A]` : '';
    console.log(`    ${color}${icon}${reset} ${checkName}: ${stats.passed}/${applicable} (${rate}%)${naNote}`);
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
      pass_rate: `${((report.summary.passed / report.summary.cases) * 100).toFixed(1)}%`,
      label_accuracy: report.summary.label_accuracy
        ? `${report.summary.label_accuracy.accuracy}%`
        : undefined
    }
  };

  return artifact;
}
