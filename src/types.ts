/**
 * Love Eval Types
 * Type definitions for empathy evaluation cases and results
 */

export type CheckType = 'agency_language' | 'unverifiable_reassurance' | 'topic_pivot';

/**
 * A single evaluation case from the JSONL file
 */
export interface EvalCase {
  id: string;
  user: string;
  assistant: string;
  checks: CheckType[];
  expected?: Partial<Record<CheckType, boolean>>;
  tags?: string[];
  notes?: string;
}

/**
 * Result from the agency language checker
 */
export interface AgencyResult {
  pass: boolean;
  score: number;
  pos_hits: string[];
  neg_hits: string[];
}

/**
 * Result from the unverifiable reassurance checker
 */
export interface ReassuranceResult {
  pass: boolean;
  hits: string[];
  mind_reading_hits: string[];
  guarantee_hits: string[];
}

/**
 * Result from the topic pivot checker
 */
export interface PivotResult {
  pass: boolean;
  applicable: boolean;  // false if no vulnerability detected
  anchor_similarity: number;
  ack_present: boolean;
  anchor_text: string;
  vuln_hits: string[];
  ack_hits: string[];
}

/**
 * Union type for all check results
 */
export type CheckResult = AgencyResult | ReassuranceResult | PivotResult;

/**
 * Label comparison result
 */
export interface LabelComparison {
  expected: boolean;
  actual: boolean;
  match: boolean;
}

/**
 * Results for a single evaluation case
 */
export interface CaseResult {
  id: string;
  checks: {
    agency_language?: AgencyResult;
    unverifiable_reassurance?: ReassuranceResult;
    topic_pivot?: PivotResult;
  };
  pass: boolean;
  /** Comparison against case labels (if expected values provided) */
  label_comparison?: Partial<Record<CheckType, LabelComparison>>;
  /** True if this is a negative example (expected to fail) */
  is_negative_example?: boolean;
}

/**
 * Failure record for the report
 */
export interface FailureRecord {
  id: string;
  failed: CheckType[];
  evidence: Record<string, unknown>;
  /** True if this failure was expected (negative example) */
  expected_failure?: boolean;
}

/**
 * Summary statistics by check type
 */
export interface CheckSummary {
  passed: number;
  failed: number;
  not_applicable: number;
}

/**
 * Per-check label accuracy
 */
export interface CheckLabelAccuracy {
  total: number;
  matched: number;
  accuracy: number;
}

/**
 * Overall report summary
 */
export interface ReportSummary {
  /** Total cases evaluated */
  cases: number;

  /** Cases that passed all checks (includes negative examples that correctly failed) */
  passed: number;

  /** Cases that failed at least one check */
  failed: number;

  /** CI-relevant: cases that passed excluding negative examples */
  strict_passed: number;

  /** CI-relevant: unexpected failures (regressions) — this drives exit code */
  strict_failed: number;

  /** Negative examples that correctly failed (regression tests working) */
  expected_failures: number;

  /** Unexpected failures (bugs/regressions) — same as strict_failed */
  unexpected_failures: number;

  /** Per-check pass/fail/N/A counts */
  by_check: Partial<Record<CheckType, CheckSummary>>;

  /** Overall label accuracy: computed vs expected match rate */
  label_accuracy?: {
    total: number;
    matched: number;
    accuracy: number;
  };

  /** Per-check label accuracy breakdown */
  label_accuracy_by_check?: Partial<Record<CheckType, CheckLabelAccuracy>>;
}

/**
 * Complete evaluation report
 */
export interface EvalReport {
  summary: ReportSummary;
  failures: FailureRecord[];
  results: CaseResult[];
}

/**
 * CLI options
 */
export interface CLIOptions {
  cases: string;
  schema: string;
  out: string;
  failOn: number;
}
