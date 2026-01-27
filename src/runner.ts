/**
 * Evaluation Runner
 *
 * Runs all checks on all cases, computes metrics, compares to labels
 */

import type {
  EvalCase,
  CaseResult,
  CheckType,
  CheckSummary,
  CheckLabelAccuracy,
  FailureRecord,
  ReportSummary
} from './types.js';
import { checkAgency } from './checks/agency.js';
import { checkReassurance } from './checks/reassurance.js';
import { checkPivot } from './checks/pivot.js';

/**
 * Check if a case is tagged as a negative example
 */
function isNegativeExample(evalCase: EvalCase): boolean {
  return evalCase.tags?.includes('negative_example') ||
         evalCase.tags?.some(t => t.endsWith('-fail')) ||
         false;
}

/**
 * Run a single evaluation case
 */
export function runCase(evalCase: EvalCase): CaseResult {
  const { id, user, assistant, checks, expected } = evalCase;

  const result: CaseResult = {
    id,
    checks: {},
    pass: true,
    is_negative_example: isNegativeExample(evalCase)
  };

  // Run each requested check
  for (const check of checks) {
    switch (check) {
      case 'agency_language': {
        const agencyResult = checkAgency(assistant);
        result.checks.agency_language = agencyResult;
        if (!agencyResult.pass) {
          result.pass = false;
        }
        break;
      }

      case 'unverifiable_reassurance': {
        const reassuranceResult = checkReassurance(assistant);
        result.checks.unverifiable_reassurance = reassuranceResult;
        if (!reassuranceResult.pass) {
          result.pass = false;
        }
        break;
      }

      case 'topic_pivot': {
        const pivotResult = checkPivot(user, assistant);
        result.checks.topic_pivot = pivotResult;
        // Only count as failure if applicable (vulnerability was present)
        if (!pivotResult.pass && pivotResult.applicable) {
          result.pass = false;
        }
        break;
      }
    }
  }

  // Compare computed results to expected labels (if provided)
  if (expected) {
    result.label_comparison = {};
    for (const check of checks) {
      if (expected[check] !== undefined) {
        const checkResult = result.checks[check];
        const actual = checkResult?.pass ?? true;
        result.label_comparison[check] = {
          expected: expected[check],
          actual,
          match: expected[check] === actual
        };
      }
    }
  }

  return result;
}

/**
 * Extract evidence from a case result for failure reporting
 */
function extractEvidence(result: CaseResult, failedChecks: CheckType[]): Record<string, unknown> {
  const evidence: Record<string, unknown> = {};

  for (const check of failedChecks) {
    const checkResult = result.checks[check];
    if (!checkResult) continue;

    switch (check) {
      case 'agency_language':
        if ('score' in checkResult) {
          evidence.agency_score = checkResult.score;
          evidence.neg_hits = checkResult.neg_hits;
        }
        break;

      case 'unverifiable_reassurance':
        if ('hits' in checkResult) {
          evidence.reassurance_hits = checkResult.hits;
          if ('mind_reading_hits' in checkResult) {
            evidence.mind_reading_hits = checkResult.mind_reading_hits;
          }
          if ('guarantee_hits' in checkResult) {
            evidence.guarantee_hits = checkResult.guarantee_hits;
          }
        }
        break;

      case 'topic_pivot':
        if ('anchor_similarity' in checkResult) {
          evidence.anchor_similarity = checkResult.anchor_similarity;
          evidence.ack_present = checkResult.ack_present;
          if ('applicable' in checkResult) {
            evidence.applicable = checkResult.applicable;
          }
        }
        break;
    }
  }

  return evidence;
}

/**
 * Run all evaluation cases and compute aggregate metrics
 */
export function runAllCases(cases: EvalCase[]): {
  results: CaseResult[];
  failures: FailureRecord[];
  summary: ReportSummary;
} {
  const results: CaseResult[] = [];
  const failures: FailureRecord[] = [];

  // Track per-check statistics (with N/A support)
  const checkStats: Record<CheckType, { passed: number; failed: number; not_applicable: number }> = {
    agency_language: { passed: 0, failed: 0, not_applicable: 0 },
    unverifiable_reassurance: { passed: 0, failed: 0, not_applicable: 0 },
    topic_pivot: { passed: 0, failed: 0, not_applicable: 0 }
  };

  // Track per-check label accuracy
  const labelByCheck: Record<CheckType, { total: number; matched: number }> = {
    agency_language: { total: 0, matched: 0 },
    unverifiable_reassurance: { total: 0, matched: 0 },
    topic_pivot: { total: 0, matched: 0 }
  };

  let passedCases = 0;
  let failedCases = 0;
  let expectedFailures = 0;
  let unexpectedFailures = 0;

  // Overall label tracking
  let labelTotal = 0;
  let labelMatched = 0;

  // Count non-negative cases for strict stats
  let nonNegativeCases = 0;

  for (const evalCase of cases) {
    const result = runCase(evalCase);
    results.push(result);

    const isNegative = result.is_negative_example || false;
    if (!isNegative) {
      nonNegativeCases++;
    }

    // Update per-check stats
    for (const check of evalCase.checks) {
      const checkResult = result.checks[check];
      if (checkResult) {
        const stats = checkStats[check];

        // Handle N/A for pivot check
        if (check === 'topic_pivot' && 'applicable' in checkResult && !checkResult.applicable) {
          stats.not_applicable++;
        } else if (checkResult.pass) {
          stats.passed++;
        } else {
          stats.failed++;
        }
      }
    }

    // Track label comparison accuracy (overall and per-check)
    if (result.label_comparison) {
      for (const [check, comparison] of Object.entries(result.label_comparison)) {
        if (comparison) {
          labelTotal++;
          labelByCheck[check as CheckType].total++;

          if (comparison.match) {
            labelMatched++;
            labelByCheck[check as CheckType].matched++;
          }
        }
      }
    }

    // Track overall case pass/fail
    if (result.pass) {
      passedCases++;
    } else {
      failedCases++;

      // Classify as expected or unexpected failure
      if (isNegative) {
        expectedFailures++;
      } else {
        unexpectedFailures++;
      }

      // Collect failed checks for this case
      const failedChecks: CheckType[] = [];
      for (const check of evalCase.checks) {
        const checkResult = result.checks[check];
        if (checkResult && !checkResult.pass) {
          // For pivot, only count if applicable
          if (check === 'topic_pivot' && 'applicable' in checkResult && !checkResult.applicable) {
            continue;
          }
          failedChecks.push(check);
        }
      }

      if (failedChecks.length > 0) {
        failures.push({
          id: result.id,
          failed: failedChecks,
          evidence: extractEvidence(result, failedChecks),
          expected_failure: isNegative
        });
      }
    }
  }

  // Build by_check summary (only include checks that were actually used)
  const usedChecks = new Set(cases.flatMap(c => c.checks));
  const by_check: Partial<Record<CheckType, CheckSummary>> = {};
  for (const check of usedChecks) {
    by_check[check] = checkStats[check];
  }

  // Compute strict stats (excluding negative examples)
  const strictPassed = nonNegativeCases - unexpectedFailures;
  const strictFailed = unexpectedFailures;

  // Build summary
  const summary: ReportSummary = {
    cases: cases.length,
    passed: passedCases,
    failed: failedCases,
    strict_passed: strictPassed,
    strict_failed: strictFailed,
    expected_failures: expectedFailures,
    unexpected_failures: unexpectedFailures,
    by_check
  };

  // Add overall label accuracy if we have labels
  if (labelTotal > 0) {
    summary.label_accuracy = {
      total: labelTotal,
      matched: labelMatched,
      accuracy: Math.round((labelMatched / labelTotal) * 1000) / 10
    };

    // Add per-check label accuracy
    const labelAccuracyByCheck: Partial<Record<CheckType, CheckLabelAccuracy>> = {};
    for (const check of usedChecks) {
      const checkLabel = labelByCheck[check];
      if (checkLabel.total > 0) {
        labelAccuracyByCheck[check] = {
          total: checkLabel.total,
          matched: checkLabel.matched,
          accuracy: Math.round((checkLabel.matched / checkLabel.total) * 1000) / 10
        };
      }
    }
    summary.label_accuracy_by_check = labelAccuracyByCheck;
  }

  return {
    results,
    failures,
    summary
  };
}
