/**
 * F3 planted-RED pack: inverted oracle (GREEN on a planted row fails the test).
 *
 * Schema-class rows must fail Ajv and never reach the checker.
 * Theater-class rows must be Ajv-GREEN and performative_empathy must flag.
 * Not a mutator; do not load the mixed file through loadCases (one Ajv-RED
 * line would abort the pack).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateCase } from '../src/load.js';
import { runCase } from '../src/runner.js';
import type { EvalCase } from '../src/types.js';

const REPO_ROOT = join(__dirname, '..');
const SCHEMA = join(REPO_ROOT, 'schemas', 'eval_case.schema.json');
const PLANTED = join(REPO_ROOT, 'data', 'planted-theater.jsonl');
const EVALS = join(REPO_ROOT, 'data', 'evals.jsonl');
const FAIRNESS = join(REPO_ROOT, 'data', 'fairness.jsonl');

type PlantedRow = {
  tags?: unknown;
  id?: unknown;
  checks?: unknown;
};

function parseJsonl(path: string): unknown[] {
  return readFileSync(path, 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, i) => {
      try {
        return JSON.parse(line) as unknown;
      } catch (err) {
        throw new Error(`planted-theater.jsonl line ${i + 1}: ${(err as Error).message}`);
      }
    });
}

function tagsOf(row: unknown): string[] {
  if (!row || typeof row !== 'object') return [];
  const tags = (row as PlantedRow).tags;
  return Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [];
}

function labelOf(row: unknown, index: number): string {
  if (row && typeof row === 'object' && 'id' in row) {
    return String((row as PlantedRow).id);
  }
  return `line-${index + 1}`;
}

describe('planted-theater JSONL pack', () => {
  const rows = parseJsonl(PLANTED);
  const schemaRows = rows.filter((row) => tagsOf(row).includes('schema'));
  const theaterRows = rows.filter((row) => tagsOf(row).includes('theater'));

  it('is a t=2 covering array of schema vs theater (~12–20 rows)', () => {
    expect(rows.length).toBeGreaterThanOrEqual(12);
    expect(rows.length).toBeLessThanOrEqual(20);
    expect(schemaRows.length).toBeGreaterThanOrEqual(4);
    expect(theaterRows.length).toBeGreaterThanOrEqual(4);
    expect(schemaRows.length + theaterRows.length).toBe(rows.length);
    for (const row of rows) {
      const tags = tagsOf(row);
      const classes = tags.filter((t) => t === 'schema' || t === 'theater');
      expect(classes, labelOf(row, 0)).toHaveLength(1);
    }
  });

  it('does not mix planted RED into data/evals.jsonl or data/fairness.jsonl', () => {
    const evalsText = readFileSync(EVALS, 'utf-8');
    const fairnessText = readFileSync(FAIRNESS, 'utf-8');
    expect(evalsText).not.toMatch(/"theater"/);
    expect(evalsText).not.toMatch(/"schema"/);
    expect(fairnessText).not.toMatch(/"theater"/);
    expect(fairnessText).not.toMatch(/"schema"/);
  });
});

describe('inverted oracle', () => {
  const rows = parseJsonl(PLANTED);

  it('schema-class rows fail Ajv (never reach the checker)', () => {
    let n = 0;
    rows.forEach((row, i) => {
      if (!tagsOf(row).includes('schema')) return;
      n += 1;
      const result = validateCase(row, SCHEMA);
      expect(result.valid, `${labelOf(row, i)} must be Ajv-RED`).toBe(false);
    });
    expect(n).toBeGreaterThan(0);
  });

  it('theater-class rows load and the checker flags — a GREEN theater row fails', () => {
    let n = 0;
    rows.forEach((row, i) => {
      if (!tagsOf(row).includes('theater')) return;
      n += 1;
      const id = labelOf(row, i);
      const loaded = validateCase(row, SCHEMA);
      expect(loaded.valid, `${id} theater must be Ajv-GREEN`).toBe(true);
      expect((row as PlantedRow).id).toMatch(/^[A-Z]+-[0-9]+$/);

      const evalCase = row as EvalCase;
      expect(evalCase.checks).toContain('performative_empathy');
      const result = runCase(evalCase);
      const pe = result.checks.performative_empathy;
      expect(pe, `${id} must run performative_empathy`).toBeDefined();
      // Inverted oracle: GREEN on a planted theater row is a failed test.
      expect(pe!.pass, `GREEN theater row fails inverted oracle: ${id}`).toBe(false);
      expect(pe!.state, `GREEN theater row fails inverted oracle: ${id}`).toBe('flag');
      expect(pe!.applicable).toBe(true);
    });
    expect(n).toBeGreaterThan(0);
  });
});
