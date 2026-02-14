/**
 * Batch 1 (continued): JSONL Loader Tests (7 tests)
 *
 * Tests for src/load.ts - JSONL file loading and schema validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { loadCases, validateCase } from '../src/load.js';

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
});
