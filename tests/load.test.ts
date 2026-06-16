/**
 * Batch 1 (continued): JSONL Loader Tests (7 tests)
 *
 * Tests for src/load.ts - JSONL file loading and schema validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { loadCases, validateCase } from '../src/load.js';

// The real bundled schema (not the simplified testSchema below) is used for the
// TEST-008 guard tests, which assert behavior specific to its
// `additionalProperties: false` constraints on `expected`.
const REAL_SCHEMA = join(process.cwd(), 'schemas', 'eval_case.schema.json');

const TEST_DIR = join(process.cwd(), 'test-fixtures-load');
const TEST_CASES = join(TEST_DIR, 'cases.jsonl');
const TEST_SCHEMA = join(TEST_DIR, 'schema.json');

// Test schema
const testSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "user", "assistant", "checks"],
  "properties": {
    "id": { "type": "string" },
    "user": { "type": "string" },
    "assistant": { "type": "string" },
    "checks": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["agency_language", "unverifiable_reassurance", "topic_pivot"]
      }
    },
    "expected": { "type": "object" },
    "tags": { "type": "array", "items": { "type": "string" } },
    "notes": { "type": "string" }
  }
};

describe('JSONL Loader Tests', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(TEST_SCHEMA, JSON.stringify(testSchema, null, 2));
  });

  afterEach(() => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('loadCases', () => {
    it('test_load_cases_reads_valid_jsonl - reads valid JSONL file', () => {
      const case1 = { id: "case-1", user: "Hello", assistant: "Hi", checks: ["agency_language"] };
      const case2 = { id: "case-2", user: "Help", assistant: "Sure", checks: ["unverifiable_reassurance"] };

      writeFileSync(TEST_CASES, [
        JSON.stringify(case1),
        JSON.stringify(case2)
      ].join('\n'));

      const cases = loadCases(TEST_CASES, TEST_SCHEMA);

      expect(cases).toHaveLength(2);
      expect(cases[0].id).toBe("case-1");
      expect(cases[1].id).toBe("case-2");
    });

    it('test_load_cases_skips_empty_lines - skips empty lines in JSONL', () => {
      const case1 = { id: "case-1", user: "Hello", assistant: "Hi", checks: ["agency_language"] };
      const case2 = { id: "case-2", user: "Help", assistant: "Sure", checks: ["agency_language"] };

      writeFileSync(TEST_CASES, [
        JSON.stringify(case1),
        '',           // empty line
        '   ',        // whitespace only
        JSON.stringify(case2),
        ''            // trailing empty
      ].join('\n'));

      const cases = loadCases(TEST_CASES, TEST_SCHEMA);

      expect(cases).toHaveLength(2);
    });

    it('test_load_cases_invalid_json_raises - throws on invalid JSON', () => {
      writeFileSync(TEST_CASES, '{ not valid json }');

      expect(() => loadCases(TEST_CASES, TEST_SCHEMA)).toThrow();
    });

    it('test_load_cases_schema_validation_error_details - reports schema validation errors', () => {
      // Missing required field 'checks'
      const invalidCase = { id: "bad", user: "x", assistant: "y" };
      writeFileSync(TEST_CASES, JSON.stringify(invalidCase));

      expect(() => loadCases(TEST_CASES, TEST_SCHEMA)).toThrow(/Failed to load/);
    });

    it('test_load_cases_multiple_errors_accumulate - accumulates multiple errors', () => {
      const invalid1 = { id: "bad1", user: "x" };  // missing assistant, checks
      const invalid2 = { id: "bad2", assistant: "y" };  // missing user, checks

      writeFileSync(TEST_CASES, [
        JSON.stringify(invalid1),
        JSON.stringify(invalid2)
      ].join('\n'));

      expect(() => loadCases(TEST_CASES, TEST_SCHEMA)).toThrow(/Failed to load 2 case/);
    });
  });

  describe('validateCase', () => {
    it('test_validate_case_valid - returns valid for correct case', () => {
      const validCase = {
        id: "test",
        user: "Hello",
        assistant: "Hi there",
        checks: ["agency_language"]
      };

      const result = validateCase(validCase, TEST_SCHEMA);

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('test_validate_case_invalid_returns_errors - returns errors for invalid case', () => {
      const invalidCase = {
        id: "test",
        user: "Hello"
        // missing assistant and checks
      };

      const result = validateCase(invalidCase, TEST_SCHEMA);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('TEST-008: expected-key guards (real bundled schema)', () => {
    // The bundled schema constrains `expected` with `additionalProperties: false`
    // over the three known check enums. These tests pin the two distinct cases:
    // (1) an UNKNOWN expected key is REJECTED at the schema boundary; (2) a
    // KNOWN expected key that simply isn't in `checks` is SCHEMA-VALID (the
    // runner silently ignores it — see runner.test.ts for the runtime half).

    it('rejects an expected key that is not a known check (additionalProperties: false)', () => {
      const badCase = {
        id: "AB-1",
        user: "x",
        assistant: "y",
        checks: ["agency_language"],
        expected: { bogus_check: true }
      };

      const result = validateCase(badCase, REAL_SCHEMA);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some(e => /additional/i.test(e))).toBe(true);
    });

    it('rejects an unknown top-level key (additionalProperties: false)', () => {
      const badCase = {
        id: "AB-2",
        user: "x",
        assistant: "y",
        checks: ["agency_language"],
        surprise: 1
      };

      const result = validateCase(badCase, REAL_SCHEMA);

      expect(result.valid).toBe(false);
    });

    it('documents silently-ignored: a valid expected key NOT in checks is schema-valid', () => {
      // `expected.topic_pivot` is a known enum, so the schema accepts it even
      // though `checks` only requests agency_language. The runner does NOT cross-
      // validate this — it iterates `checks`, so the extra expected entry is
      // silently dropped (see runner.test.ts: "silently ignores expected entry
      // for a check not in checks").
      const looseCase = {
        id: "AB-3",
        user: "x",
        assistant: "y",
        checks: ["agency_language"],
        expected: { topic_pivot: true }
      };

      const result = validateCase(looseCase, REAL_SCHEMA);

      expect(result.valid).toBe(true);
    });
  });

  describe('TEST-008 (runtime): empty cases file is a fatal error', () => {
    it('throws on a whitespace-only cases file (N/A != clean)', () => {
      // An empty/whitespace-only file must not be a vacuous exit-0; loadCases
      // raises rather than returning [].
      writeFileSync(TEST_CASES, "\n   \n\n");

      expect(() => loadCases(TEST_CASES, TEST_SCHEMA)).toThrow(/No valid cases/);
    });
  });
});
