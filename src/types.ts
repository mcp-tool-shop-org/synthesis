/**
 * Love Eval Types
 * Type definitions for empathy evaluation cases and results
 */

export type CheckType =
  | 'agency_language'
  | 'unverifiable_reassurance'
  | 'topic_pivot'
  | 'performative_empathy'
  | 'grounded_uptake';

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
  pass_strength: 'clear_pass' | 'borderline_pass' | 'clear_fail' | 'not_applicable';
  anchor_similarity: number;
  ack_present: boolean;
  anchor_text: string;
  vuln_hits: string[];
  ack_hits: string[];
}

/**
 * Result from the performative empathy (empathy-theater) checker — a pure DETECTOR.
 *
 * TWO states only: 'flag' (high-confidence theater) and 'not_applicable' (abstain).
 * There is NO positive "pass"/"genuine"/"sincere" verdict: no deterministic feature can
 * separate genuine engagement from gamed padding (proven over five adversarial rounds), so
 * the tool never certifies sincerity (honesty contract). `pass` is true for 'not_applicable'
 * and false ONLY for 'flag'.
 */
export interface PerformativeEmpathyResult {
  pass: boolean;
  applicable: boolean; // false when state === 'not_applicable' (abstain)
  state: 'flag' | 'not_applicable';
  warmth_present: boolean;
  genericness: number; // [0,1] — template + filler density (Li 2016)
  template_density: number; // [0,1] — char-weighted template fraction
  filler_ratio: number; // [0,1]
  particularity: number; // [0,1] — grounded + concreteness blend, anti-parrot applied
  grounded_overlap: number; // [0,1] — IDF-weighted user-content overlap (grounding gate)
  verbatim_ratio: number; // [0,1] — anti-parroting penalty (Bender/Liu)
  concreteness: number | null; // [0,1] or null when < MIN_CONCRETENESS_TOKENS (dropped)
  hollow_margin: number; // genericness - particularity
  user_content_count: number; // |user_content_set|
  template_hits: string[]; // matched template spans (evidence)
  missing_user_content: string[]; // top user content words (by IDF) the assistant did NOT engage
  echoed_spans: string[]; // verbatim >=3-grams copied from the user (anti-parroting receipt)
  thresholds: { genericness_flag: number; particularity_floor: number; min_margin: number };
}

/**
 * Result from the grounded_uptake checker — the proof-carrying POSITIVE witness.
 *
 * The companion to performative_empathy. Where performative_empathy detects the hollow and
 * never certifies the sincere, grounded_uptake makes a NARROWER positive claim that IS
 * deterministically defensible: it certifies that OBSERVABLE grounded engagement was
 * performed — the response took up the user's specific situation, recombined (not parroted),
 * with a real support move, without being warmth-dominated or unsafe.
 *
 * THREE states: 'verified_uptake' (all witnesses agree), 'no_verified_uptake' (assessed but
 * the witnesses did not all hold), 'not_applicable' (nothing to take up — no vulnerable
 * disclosure / too little user content).
 *
 * `verified_uptake` means observable grounded engagement was detected. It does NOT mean the
 * response is sincere, emotionally correct, therapeutic, or good. The construct is observable
 * BEHAVIOR, not inner state — which is exactly why it is honest where a "sincere" verdict
 * could not be (Jacobs & Wallach 2021, measurement-modeling: never collapse a proxy into the
 * construct). It is robust by construction: the only way to earn it is to perform the work.
 *
 * `pass` is ALWAYS true — grounded_uptake is a positive witness, not a defect detector, so it
 * never fails a case or drives the exit code. The verdict lives in `state`.
 */
export interface GroundedUptakeResult {
  pass: boolean; // always true — positive witness; never a case failure / exit-code driver
  applicable: boolean; // true when assessed (verified_uptake | no_verified_uptake), false on abstain
  state: 'verified_uptake' | 'no_verified_uptake' | 'not_applicable';
  grounded_anchors: string[]; // user-specific terms taken up in the NON-template residual (evidence)
  support_moves: string[]; // matched grounded moves: question / offer / interpretation (evidence)
  genericness: number; // [0,1] template+filler density (template-containment witness)
  grounded_overlap: number; // [0,1] fraction of salient user content taken up (evidence)
  verbatim_ratio: number; // [0,1] anti-parroting penalty (Bender/Liu)
  user_content_count: number; // |user_content_set|
  /** The five witnesses — verified_uptake requires ALL true (the conjunction is the robustness). */
  witnesses: {
    grounded_anchor: boolean; // >=1 user-specific stem reflected in the residual
    non_parroting: boolean; // >=1 grounded anchor occurs outside any verbatim >=3-gram copy
    support_move: boolean; // >=1 grounded question / offer / interpretation
    template_contained: boolean; // warmth does not dominate (genericness <= ceiling)
    safety_compatible: boolean; // does NOT fail agency / reassurance / pivot
  };
  /**
   * Per-checker safety pass — the composition receipt. Composes the two TRUE safety guards:
   *   agency      = NO coercive/directive language (agency.neg_hits empty) — NOT agency.pass,
   *                 which requires positive autonomy phrasing a neutral-but-safe reply may lack;
   *   reassurance = no mind-reading / unverifiable guarantees (reassurance.pass).
   * topic_pivot is deliberately NOT a safety gate here: it rewards surface overlap, which
   * directly opposes the non-parroting witness, so it false-fails the gold-standard PARAPHRASED
   * grounded reply. Pivot belongs in the relational_posture summary, not the uptake witness.
   */
  safety: { agency: boolean; reassurance: boolean };
  reason: string; // one-line plain-English explanation of the verdict
  thresholds: { genericness_ceiling: number; min_user_content: number };
}

/**
 * Union type for all check results
 */
export type CheckResult =
  | AgencyResult
  | ReassuranceResult
  | PivotResult
  | PerformativeEmpathyResult
  | GroundedUptakeResult;

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
    performative_empathy?: PerformativeEmpathyResult;
    grounded_uptake?: GroundedUptakeResult;
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
