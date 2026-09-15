/**
 * F4 gold polarity: Ajv draft-07 compile of schemas/eval_report.schema.json.
 *
 * tests/gold/report.good.json MUST validate; tests/gold/report.fail.json MUST NOT.
 * fail = illegal envelope (extra key / missing relational_posture / illegal state),
 * not a failed-eval with failures[]. Semantic claims/non_claims stay a code verifier.
 *
 * Also Ajv schemas/report.good.json and schemas/report.fail.json so CI gold and
 * test gold cannot drift in polarity.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const REPO_ROOT = join(__dirname, '..');
const SCHEMA_PATH = join(REPO_ROOT, 'schemas', 'eval_report.schema.json');
const TEST_GOOD = join(REPO_ROOT, 'tests', 'gold', 'report.good.json');
const TEST_FAIL = join(REPO_ROOT, 'tests', 'gold', 'report.fail.json');
const CI_GOOD = join(REPO_ROOT, 'schemas', 'report.good.json');
const CI_FAIL = join(REPO_ROOT, 'schemas', 'report.fail.json');

const LIVE_STATES = new Set([
  'hollow_warmth_flagged',
  'unsafe_comfort',
  'pivot_or_abandonment',
  'grounded_uptake_verified',
  'unresolved_abstain',
]);

function loadJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function asRecord(value: unknown): Record<string, unknown> {
  expect(value).toBeTypeOf('object');
  expect(value).not.toBeNull();
  return value as Record<string, unknown>;
}

/** fail must be illegal as an envelope, not because it lists checker failures. */
function assertIllegalEnvelopeNotFailedEval(value: unknown): void {
  const rec = asRecord(value);
  const failures = rec.failures;
  expect(Array.isArray(failures) ? failures : []).toHaveLength(0);

  const extraRoot = Object.keys(rec).some(
    (k) => k !== 'summary' && k !== 'failures' && k !== 'results'
  );
  const results = Array.isArray(rec.results) ? rec.results : [];
  const missingPosture = results.some(
    (row) => !row || typeof row !== 'object' || !('relational_posture' in row)
  );
  const illegalState = results.some((row) => {
    if (!row || typeof row !== 'object') return false;
    const posture = (row as { relational_posture?: { state?: unknown } }).relational_posture;
    if (!posture || typeof posture !== 'object') return false;
    return typeof posture.state === 'string' && !LIVE_STATES.has(posture.state);
  });
  expect(extraRoot || missingPosture || illegalState).toBe(true);
}

describe('eval_report schema gold polarity', () => {
  const schema = asRecord(loadJson(SCHEMA_PATH));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  it('is draft-07 with a closed model and required relational_posture', () => {
    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(schema.additionalProperties).toBe(false);
    const defs = asRecord(schema.definitions);
    const caseResult = asRecord(defs.caseResult);
    expect(caseResult.required).toEqual(expect.arrayContaining(['relational_posture']));
    const posture = asRecord(defs.relationalPosture);
    const state = asRecord(asRecord(posture.properties).state);
    expect(state.enum).toEqual(expect.arrayContaining([...LIVE_STATES]));
  });

  it('tests/gold/report.good.json MUST validate (legal envelope)', () => {
    const good = loadJson(TEST_GOOD);
    expect(validate(good), JSON.stringify(validate.errors)).toBe(true);
  });

  it('tests/gold/report.fail.json MUST NOT validate (illegal envelope)', () => {
    const fail = loadJson(TEST_FAIL);
    assertIllegalEnvelopeNotFailedEval(fail);
    expect(validate(fail)).toBe(false);
  });

  it('schemas/report.good.json MUST validate (CI gold polarity)', () => {
    const good = loadJson(CI_GOOD);
    expect(validate(good), JSON.stringify(validate.errors)).toBe(true);
  });

  it('schemas/report.fail.json MUST NOT validate (CI gold polarity)', () => {
    const fail = loadJson(CI_FAIL);
    assertIllegalEnvelopeNotFailedEval(fail);
    expect(validate(fail)).toBe(false);
  });
});
