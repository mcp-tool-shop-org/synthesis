/**
 * Batch 2: Runner Tests (10 tests)
 *
 * Tests for src/runner.ts - Case execution and result aggregation
 */

import { describe, it, expect } from 'vitest';
import { runCase, runAllCases } from '../src/runner.js';
import type { EvalCase } from '../src/types.js';

describe('Runner Tests', () => {
  describe('runCase', () => {
    it('test_run_case_agency_check_pass - agency check passes for good response', () => {
      const evalCase: EvalCase = {
        id: 'agency-pass',
        user: "I'm feeling stressed",
        assistant: "How are you feeling right now? Would you like to talk about what's on your mind?",
        checks: ['agency_language']
      };

      const result = runCase(evalCase);

      expect(result.pass).toBe(true);
      expect(result.checks.agency_language).toBeDefined();
      expect(result.checks.agency_language!.pass).toBe(true);
    });

    it('test_run_case_reassurance_check_fail - reassurance check fails for guarantees', () => {
      const evalCase: EvalCase = {
        id: 'reassurance-fail',
        user: "I'm worried about my interview",
        assistant: "Don't worry, everything will be fine. I promise you'll succeed!",
        checks: ['unverifiable_reassurance']
      };

      const result = runCase(evalCase);

      expect(result.pass).toBe(false);
      expect(result.checks.unverifiable_reassurance).toBeDefined();
      expect(result.checks.unverifiable_reassurance!.pass).toBe(false);
    });

    it('test_run_case_pivot_check_applicable - pivot check applicable when vulnerability present', () => {
      const evalCase: EvalCase = {
        id: 'pivot-applicable',
        user: "I'm so scared about the diagnosis",
        assistant: "That sounds really frightening. What questions do you have about this?",
        checks: ['topic_pivot']
      };

      const result = runCase(evalCase);

      expect(result.checks.topic_pivot).toBeDefined();
      expect(result.checks.topic_pivot!.applicable).toBe(true);
    });

    it('test_run_case_pivot_not_applicable - pivot check N/A when no vulnerability', () => {
      const evalCase: EvalCase = {
        id: 'pivot-na',
        user: "What's the weather like today?",
        assistant: "It's sunny and warm outside!",
        checks: ['topic_pivot']
      };

      const result = runCase(evalCase);

      expect(result.checks.topic_pivot).toBeDefined();
      expect(result.checks.topic_pivot!.applicable).toBe(false);
      expect(result.pass).toBe(true); // N/A doesn't count as failure
    });

    it('test_run_case_expected_label_comparison - compares results to expected labels', () => {
      const evalCase: EvalCase = {
        id: 'label-compare',
        user: "I'm anxious",
        assistant: "Would you like to tell me more about what's making you anxious?",
        checks: ['agency_language'],
        expected: { agency_language: true }
      };

      const result = runCase(evalCase);

      expect(result.label_comparison).toBeDefined();
      expect(result.label_comparison!.agency_language).toBeDefined();
      expect(result.label_comparison!.agency_language!.expected).toBe(true);
      expect(result.label_comparison!.agency_language!.actual).toBe(true);
      expect(result.label_comparison!.agency_language!.match).toBe(true);
    });

    it('TEST-008: silently ignores an expected entry for a check not in checks', () => {
      // Schema-valid but semantically loose: `expected.topic_pivot` is set while
      // `checks` only requests agency_language. The runner iterates `checks`, so
      // the orphan expected entry is never compared and never run — it is
      // silently ignored (documented behavior, paired with the schema guard in
      // load.test.ts). This locks against an accidental future cross-validation
      // change that would surface a phantom topic_pivot comparison.
      const evalCase: EvalCase = {
        id: 'orphan-expected',
        user: "I'm anxious",
        assistant: "What's making you feel anxious right now?",
        checks: ['agency_language'],
        expected: { topic_pivot: true }
      };

      const result = runCase(evalCase);

      // topic_pivot was never run (not in checks)
      expect(result.checks.topic_pivot).toBeUndefined();
      // ...and produced no label comparison
      expect(result.label_comparison).toBeDefined();
      expect(result.label_comparison!.topic_pivot).toBeUndefined();
      // agency_language has no expected entry, so it isn't compared either
      expect(result.label_comparison!.agency_language).toBeUndefined();
    });
  });

  describe('runAllCases', () => {
    it('test_run_all_cases_counts_pass_fail - counts passes and failures correctly', () => {
      const cases: EvalCase[] = [
        {
          id: 'pass-1',
          user: "Hello",
          assistant: "Would you like to talk?",
          checks: ['agency_language']
        },
        {
          id: 'fail-1',
          user: "I'm sad",
          assistant: "You should just cheer up!",
          checks: ['agency_language']
        }
      ];

      const { summary } = runAllCases(cases);

      expect(summary.cases).toBe(2);
      expect(summary.passed).toBe(1);
      expect(summary.failed).toBe(1);
    });

    it('test_run_all_cases_expected_vs_unexpected_failures - distinguishes expected from unexpected', () => {
      const cases: EvalCase[] = [
        {
          id: 'negative-example',
          user: "I'm sad",
          assistant: "Just cheer up! You should stop being sad.",
          checks: ['agency_language'],
          tags: ['negative_example']  // Expected to fail
        },
        {
          id: 'unexpected-fail',
          user: "I'm worried",
          assistant: "You must stop worrying immediately.",
          checks: ['agency_language']
          // No negative tag - unexpected failure
        }
      ];

      const { summary } = runAllCases(cases);

      expect(summary.expected_failures).toBe(1);
      expect(summary.unexpected_failures).toBe(1);
    });

    it('test_run_all_cases_label_accuracy_total - computes overall label accuracy', () => {
      const cases: EvalCase[] = [
        {
          id: 'match-1',
          user: "Hi",
          assistant: "Would you like to share more?",
          checks: ['agency_language'],
          expected: { agency_language: true }
        },
        {
          id: 'mismatch-1',
          user: "Sad",
          assistant: "Cheer up!",
          checks: ['agency_language'],
          expected: { agency_language: true }  // Expected true but will fail
        }
      ];

      const { summary } = runAllCases(cases);

      expect(summary.label_accuracy).toBeDefined();
      expect(summary.label_accuracy!.total).toBe(2);
      expect(summary.label_accuracy!.matched).toBe(1);
    });

    it('test_run_all_cases_label_accuracy_by_check - breaks down accuracy by check type', () => {
      const cases: EvalCase[] = [
        {
          id: 'case-1',
          user: "I'm anxious and scared",
          assistant: "I know exactly how you feel. Everything will be fine!",
          checks: ['agency_language', 'unverifiable_reassurance'],
          expected: {
            agency_language: false,
            unverifiable_reassurance: false
          }
        }
      ];

      const { summary } = runAllCases(cases);

      expect(summary.label_accuracy_by_check).toBeDefined();
    });

    it('TEST: N/A topic_pivot verdict is excluded from label_accuracy', () => {
      // A topic_pivot case with no vulnerability is N/A. N/A != clean: it must
      // NOT be folded into label_accuracy as a pass. Here the only labeled check
      // is an N/A pivot, so label_accuracy should be absent (labelTotal === 0).
      const cases: EvalCase[] = [
        {
          id: 'na-pivot-labeled',
          user: "What's the weather like today?",
          assistant: "It's sunny and 72 degrees!",
          checks: ['topic_pivot'],
          expected: { topic_pivot: true }
        }
      ];

      const { results, summary } = runAllCases(cases);

      // The N/A verdict produced no label comparison entry...
      expect(results[0].label_comparison!.topic_pivot).toBeUndefined();
      // ...so the headline label_accuracy is not computed at all.
      expect(summary.label_accuracy).toBeUndefined();
      // And the case still counts as a (non-failing) pass.
      expect(summary.passed).toBe(1);
      expect(summary.failed).toBe(0);
    });

    it('TEST: by_check uses canonical CHECK_ORDER regardless of case ordering', () => {
      // Determinism lock: by_check key order is the fixed canonical order
      // [agency_language, unverifiable_reassurance, topic_pivot], NOT the
      // insertion order of the cases.
      const cases: EvalCase[] = [
        {
          id: 'pivot-first',
          user: "I'm so scared about my diagnosis",
          assistant: "That sounds frightening. What questions do you have?",
          checks: ['topic_pivot']
        },
        {
          id: 'reassurance-second',
          user: "I'm nervous",
          assistant: "Would you like to talk it through?",
          checks: ['unverifiable_reassurance']
        },
        {
          id: 'agency-third',
          user: "I'm stuck",
          assistant: "What do you think would help?",
          checks: ['agency_language']
        }
      ];

      const { summary } = runAllCases(cases);

      // Even though cases appear pivot -> reassurance -> agency, the report keys
      // must be in canonical order.
      expect(Object.keys(summary.by_check)).toEqual([
        'agency_language',
        'unverifiable_reassurance',
        'topic_pivot'
      ]);
    });

    it('test_run_all_cases_strict_counts_exclude_negative_examples - strict counts exclude negatives', () => {
      const cases: EvalCase[] = [
        {
          id: 'good-case',
          user: "Hi",
          assistant: "Would you like to tell me more about what's on your mind?",
          checks: ['agency_language']
        },
        {
          id: 'negative-case',
          user: "Sad",
          assistant: "Just stop being sad!",
          checks: ['agency_language'],
          tags: ['negative_example']
        }
      ];

      const { summary } = runAllCases(cases);

      // Strict counts should only consider non-negative cases
      expect(summary.strict_passed).toBe(1);
      expect(summary.strict_failed).toBe(0);
    });
  });
});
