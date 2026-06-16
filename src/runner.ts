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
import { checkPerformativeEmpathy } from './checks/performative.js';
import { checkGroundedUptake } from './checks/grounded_uptake.js';

/**
 * Canonical, fixed check ordering for all aggregate report objects.
 *
 * Determinism (locked invariant): iterating a Set built from case-data
 * insertion order would make report.json byte-different across case-file
 * orderings. This fixed order guarantees stable, replayable output.
 */
const CHECK_ORDER: CheckType[] = [
  'agency_language',
  'unverifiable_reassurance',
  'topic_pivot',
  'performative_empathy',
  'grounded_uptake'
];

/**
 * Check if a case is tagged as a negative example
 */
function isNegativeExample(evalCase: EvalCase): boolean {
  return evalCase.tags?.includes('negative_example') ||
         evalCase.tags?.some(t => t.endsWith('-fail')) ||
         false;
}

/**
 * Compute the canonical list of checks that count as failures for a case.
 *
 * This is the SINGLE source of truth for "which checks failed" — it applies the
 * N/A skip (an N/A topic_pivot is never a failure) exactly once. Both the
 * exit-code counters and the failures-detail array are derived from this list,
 * so an exit-2 can never be raised without a matching evidence record.
 */
function computeFailedChecks(evalCase: EvalCase, result: CaseResult): CheckType[] {
  const failedChecks: CheckType[] = [];
  for (const check of evalCase.checks) {
    const checkResult = result.checks[check];
    if (checkResult && !checkResult.pass) {
      // For any 3-state check (pivot, performative_empathy), an N/A verdict
      // (abstention) is never a failure.
      if ('applicable' in checkResult && !checkResult.applicable) {
        continue;
      }
      failedChecks.push(check);
    }
  }
  return failedChecks;
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

      case 'performative_empathy': {
        const peResult = checkPerformativeEmpathy(user, assistant);
        result.checks.performative_empathy = peResult;
        // Only an applicable flag fails the case (N/A abstains).
        if (!peResult.pass && peResult.applicable) {
          result.pass = false;
        }
        break;
      }

      case 'grounded_uptake': {
        // POSITIVE witness — never fails a case or drives the exit code (pass is always
        // true). The verified/no_verified/abstain verdict lives in `state` and is surfaced
        // via the by_check + label branches below; it is informational, not a defect.
        result.checks.grounded_uptake = checkGroundedUptake(user, assistant);
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

        // N/A != clean: an abstaining 3-state verdict (topic_pivot or
        // performative_empathy) has no genuine pass/fail to compare. Excluding it
        // entirely keeps it out of label_accuracy / label_accuracy_by_check —
        // folding it in as a 'pass' would inflate the headline metric.
        if (
          checkResult &&
          'applicable' in checkResult &&
          !checkResult.applicable
        ) {
          continue;
        }

        // grounded_uptake is a positive witness: its `pass` is always true, so the label
        // truth is whether it VERIFIED uptake (state), not pass. (no_verified_uptake -> false;
        // not_applicable was already excluded above as an abstain.)
        const actual =
          check === 'grounded_uptake' && checkResult && 'state' in checkResult
            ? checkResult.state === 'verified_uptake'
            : (checkResult?.pass ?? true);
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

      case 'performative_empathy':
        // Narrow on a performative-unique field: grounded_uptake also has `genericness`,
        // but only performative_empathy has `hollow_margin`.
        if ('hollow_margin' in checkResult) {
          evidence.genericness = checkResult.genericness;
          evidence.particularity = checkResult.particularity;
          evidence.hollow_margin = checkResult.hollow_margin;
          evidence.verbatim_ratio = checkResult.verbatim_ratio;
          evidence.template_hits = checkResult.template_hits;
          evidence.missing_user_content = checkResult.missing_user_content;
          evidence.echoed_spans = checkResult.echoed_spans;
          evidence.applicable = checkResult.applicable;
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
    topic_pivot: { passed: 0, failed: 0, not_applicable: 0 },
    performative_empathy: { passed: 0, failed: 0, not_applicable: 0 },
    grounded_uptake: { passed: 0, failed: 0, not_applicable: 0 }
  };

  // Track per-check label accuracy
  const labelByCheck: Record<CheckType, { total: number; matched: number }> = {
    agency_language: { total: 0, matched: 0 },
    unverifiable_reassurance: { total: 0, matched: 0 },
    topic_pivot: { total: 0, matched: 0 },
    performative_empathy: { total: 0, matched: 0 },
    grounded_uptake: { total: 0, matched: 0 }
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

        // grounded_uptake is a positive witness with pass=true always; its by_check
        // semantics are keyed on `state`: passed = verified, "failed" = no_verified
        // (NOT a defect — it never affects exit code), not_applicable = abstain.
        if (check === 'grounded_uptake' && 'state' in checkResult) {
          if (checkResult.state === 'verified_uptake') stats.passed++;
          else if (checkResult.state === 'no_verified_uptake') stats.failed++;
          else stats.not_applicable++;
        }
        // Handle N/A for any 3-state failure-mode check (topic_pivot, performative_empathy)
        else if ('applicable' in checkResult && !checkResult.applicable) {
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

    // Track overall case pass/fail.
    // Derive the failed-checks list ONCE; counters and the failures array both
    // flow from it so a counted failure always has a matching evidence record.
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

      const failedChecks = computeFailedChecks(evalCase, result);

      failures.push({
        id: result.id,
        failed: failedChecks,
        evidence: extractEvidence(result, failedChecks),
        expected_failure: isNegative
      });
    }
  }

  // Invariant (evidence-trail completeness): every counted failure must have a
  // failure record carrying its evidence. An exit-2 without a record would hide
  // a regression.
  if (failures.length !== failedCases) {
    throw new Error(
      `Evidence-trail invariant violated: ${failedCases} failed case(s) but ${failures.length} failure record(s)`
    );
  }

  // Build by_check summary (only include checks that were actually used).
  // Iterate CHECK_ORDER (not the Set) so key order is deterministic.
  const usedChecks = new Set(cases.flatMap(c => c.checks));
  const by_check: Partial<Record<CheckType, CheckSummary>> = {};
  for (const check of CHECK_ORDER) {
    if (usedChecks.has(check)) {
      by_check[check] = checkStats[check];
    }
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

    // Add per-check label accuracy.
    // Iterate CHECK_ORDER (not the Set) so key order is deterministic.
    const labelAccuracyByCheck: Partial<Record<CheckType, CheckLabelAccuracy>> = {};
    for (const check of CHECK_ORDER) {
      if (!usedChecks.has(check)) continue;
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
