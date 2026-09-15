/**
 * F1 fairness pack: tagged FPR slices must stay their own summary fields.
 *
 * data/fairness.jsonl is genuine-care only (expected.performative_empathy true
 * = not flagged). Cardinal harm is a false flag on brief_care or dialect_like.
 * FPR columns must not fold into label_accuracy.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCases } from '../src/load.js';
import { runAllCases, runCase } from '../src/runner.js';
import type { EvalCase, ReportSummary } from '../src/types.js';

const REPO_ROOT = join(__dirname, '..');
const SCHEMA = join(REPO_ROOT, 'schemas', 'eval_case.schema.json');
const FAIRNESS = join(REPO_ROOT, 'data', 'fairness.jsonl');
const EVALS = join(REPO_ROOT, 'data', 'evals.jsonl');
const DATASHEET = join(REPO_ROOT, 'data', 'DATASHEET.md');

const FPR_FIELDS = [
  'fpr_brief_care',
  'fpr_dialect_like',
  'n_brief_care',
  'n_dialect_like',
] as const;

function asRecord(summary: ReportSummary): Record<string, unknown> {
  return summary as unknown as Record<string, unknown>;
}

function slice(cases: EvalCase[], tag: string): EvalCase[] {
  return cases.filter((c) => c.tags?.includes(tag));
}

describe('fairness JSONL pack', () => {
  const cases = loadCases(FAIRNESS, SCHEMA);
  const brief = slice(cases, 'brief_care');
  const dialect = slice(cases, 'dialect_like');

  it('has two exclusive slices of 12–20 rows (Herlihy: tiny slices hide harm)', () => {
    expect(brief.length).toBeGreaterThanOrEqual(12);
    expect(brief.length).toBeLessThanOrEqual(20);
    expect(dialect.length).toBeGreaterThanOrEqual(12);
    expect(dialect.length).toBeLessThanOrEqual(20);
    expect(brief.length + dialect.length).toBe(cases.length);
    expect(brief.some((c) => c.tags?.includes('dialect_like'))).toBe(false);
    expect(dialect.some((c) => c.tags?.includes('brief_care'))).toBe(false);
  });

  it('encodes not_flagged as expected.performative_empathy true (do not invert)', () => {
    for (const c of cases) {
      expect(c.checks).toContain('performative_empathy');
      expect(c.expected?.performative_empathy).toBe(true);
      expect(c.tags).toContain('not_flagged');
      expect(c.id).toMatch(/^[A-Z]+-[0-9]+$/);
    }
  });

  it('does not mix fairness rows into data/evals.jsonl', () => {
    const evalsText = readFileSync(EVALS, 'utf-8');
    expect(evalsText).not.toMatch(/brief_care/);
    expect(evalsText).not.toMatch(/dialect_like/);
  });

  it('datasheet states dialect_like is informal-register, not a demographic classifier', () => {
    const sheet = readFileSync(DATASHEET, 'utf-8');
    expect(sheet).toMatch(/informal/i);
    expect(sheet).toMatch(/not.*race/i);
    expect(sheet).toMatch(/not.*demographic/i);
    expect(sheet).toMatch(/FairOPT/);
    expect(sheet).toMatch(/not for/i);
    expect(sheet).toMatch(/lexicon/i);
  });

  it('frozen checker does not flag genuine brief or informal-register care', () => {
    for (const c of cases) {
      const result = runCase(c);
      const pe = result.checks.performative_empathy;
      expect(pe, c.id).toBeDefined();
      expect(pe!.pass, `false flag on ${c.id}`).toBe(true);
      expect(pe!.state, `false flag on ${c.id}`).not.toBe('flag');
    }
  });
});

describe('fairness FPR summary columns', () => {
  it('summary.fpr_* and n_* exist as their own fields and are not mixed into label_accuracy', () => {
    const cases = loadCases(FAIRNESS, SCHEMA);
    const briefN = slice(cases, 'brief_care').length;
    const dialectN = slice(cases, 'dialect_like').length;
    const { summary } = runAllCases(cases);
    const s = asRecord(summary);

    for (const field of FPR_FIELDS) {
      expect(s, field).toHaveProperty(field);
    }

    expect(s.n_brief_care).toBe(briefN);
    expect(s.n_dialect_like).toBe(dialectN);

    // Own fields — never nested under label_accuracy / label_accuracy_by_check.
    if (s.label_accuracy && typeof s.label_accuracy === 'object') {
      for (const field of FPR_FIELDS) {
        expect(s.label_accuracy).not.toHaveProperty(field);
      }
    }
    if (s.label_accuracy_by_check && typeof s.label_accuracy_by_check === 'object') {
      for (const field of FPR_FIELDS) {
        expect(s.label_accuracy_by_check).not.toHaveProperty(field);
      }
    }

    expect(s.label_accuracy).not.toBe(s.fpr_brief_care);
    expect(s.label_accuracy).not.toBe(s.fpr_dialect_like);
  });
});
