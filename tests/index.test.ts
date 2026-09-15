/**
 * Batch 1: CLI Tests (9 tests)
 *
 * Tests for src/index.ts - CLI argument parsing and main entry point
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// We need to test the CLI by importing and calling functions directly
// Since parseArgs is not exported, we test via the main() behavior

const TEST_DIR = join(process.cwd(), 'test-fixtures');
const TEST_CASES = join(TEST_DIR, 'test-cases.jsonl');
const TEST_SCHEMA = join(TEST_DIR, 'schema.json');
const TEST_OUT = join(TEST_DIR, 'out', 'report.json');

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
        "enum": ["agency_language", "unverifiable_reassurance", "topic_pivot", "performative_empathy", "grounded_uptake"]
      }
    },
    "expected": { "type": "object" },
    "tags": { "type": "array", "items": { "type": "string" } },
    "notes": { "type": "string" }
  }
};

// Valid test case
const validCase = {
  id: "test-001",
  user: "I'm feeling really anxious today",
  assistant: "How are you feeling right now? Would you like to talk about what's making you anxious?",
  checks: ["agency_language"]
};

describe('CLI Tests', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    mkdirSync(join(TEST_DIR, 'out'), { recursive: true });
    writeFileSync(TEST_SCHEMA, JSON.stringify(testSchema, null, 2));
  });

  afterEach(() => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    // Defaults test may write the bundled report path; do not leave it behind.
    try {
      rmSync(join(process.cwd(), 'out', 'report.json'), { force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Argument Parsing', () => {
    it('test_parse_args_defaults - uses default paths when no args provided', async () => {
      const defaultOut = join(process.cwd(), 'out', 'report.json');
      const result = await runCLI([]);

      expect(result.stdout).toContain('Loading cases from: data/evals.jsonl');
      expect(result.stdout).toContain('Using schema: schemas/eval_case.schema.json');
      expect(result.stdout).toContain('Report written to: out/report.json');
      expect(existsSync(defaultOut)).toBe(true);
    });

    it('test_parse_args_cases_schema_out - parses --cases, --schema, --out correctly', async () => {
      writeFileSync(TEST_CASES, JSON.stringify(validCase));

      const result = await runCLI([
        '--cases', TEST_CASES,
        '--schema', TEST_SCHEMA,
        '--out', TEST_OUT
      ]);

      expect(result.stdout).toContain(`Loading cases from: ${TEST_CASES}`);
      expect(result.stdout).toContain(`Using schema: ${TEST_SCHEMA}`);
      expect(result.stdout).toContain(`Report written to: ${TEST_OUT}`);
      expect(existsSync(TEST_OUT)).toBe(true);
    });

    it('test_parse_args_fail_on - parses --fail-on threshold', async () => {
      // Known unexpected failure: directive language, no agency-positive hits.
      // If --fail-on is ignored (default 0), both spawns would exit 2.
      const failingCase = {
        id: "fail-001",
        user: "I'm sad",
        assistant: "You should just cheer up and stop being so negative.",
        checks: ["agency_language"]
      };
      writeFileSync(TEST_CASES, JSON.stringify(failingCase));

      const failOnZero = await runCLI([
        '--cases', TEST_CASES,
        '--schema', TEST_SCHEMA,
        '--out', TEST_OUT,
        '--fail-on', '0'
      ]);
      expect(failOnZero.code).toBe(2);
      expect(failOnZero.stdout).toContain('unexpected failures > 0 threshold');

      const failOnOne = await runCLI([
        '--cases', TEST_CASES,
        '--schema', TEST_SCHEMA,
        '--out', TEST_OUT,
        '--fail-on', '1'
      ]);
      expect(failOnOne.code).toBe(0);
      expect(failOnOne.stdout).not.toContain('Exiting with code 2');
    });

    it('test_parse_args_help_exits_zero - --help exits with code 0', async () => {
      const result = await runCLI(['--help']);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('Usage');
      expect(result.stdout).toContain('--cases');
      expect(result.stdout).toContain('--schema');
    });
  });

  describe('Main Entry Point', () => {
    it('test_main_load_cases_success - loads valid cases successfully', async () => {
      writeFileSync(TEST_CASES, JSON.stringify(validCase));

      const result = await runCLI([
        '--cases', TEST_CASES,
        '--schema', TEST_SCHEMA,
        '--out', TEST_OUT
      ]);

      expect(result.stdout).toContain('Loaded 1 cases');
    });

    it('test_main_load_cases_failure_exits_1 - exits 1 on load failure', async () => {
      // Write invalid JSON
      writeFileSync(TEST_CASES, '{ invalid json }');

      const result = await runCLI([
        '--cases', TEST_CASES,
        '--schema', TEST_SCHEMA,
        '--out', TEST_OUT
      ]);

      expect(result.code).toBe(1);
    });

    it('test_main_exit_code_when_unexpected_failures_exceed_threshold', async () => {
      // Create a case that will fail
      const failingCase = {
        id: "fail-001",
        user: "I'm sad",
        assistant: "You should just cheer up and stop being so negative.",
        checks: ["agency_language"]
      };
      writeFileSync(TEST_CASES, JSON.stringify(failingCase));

      const result = await runCLI([
        '--cases', TEST_CASES,
        '--schema', TEST_SCHEMA,
        '--out', TEST_OUT,
        '--fail-on', '0'
      ]);

      // Should exit 2 when failures > threshold
      expect(result.code).toBe(2);
    });

    it('test_main_exit_code_when_within_threshold', async () => {
      // Create a case that will fail
      const failingCase = {
        id: "fail-001",
        user: "I'm sad",
        assistant: "You should just cheer up.",
        checks: ["agency_language"]
      };
      writeFileSync(TEST_CASES, JSON.stringify(failingCase));

      const result = await runCLI([
        '--cases', TEST_CASES,
        '--schema', TEST_SCHEMA,
        '--out', TEST_OUT,
        '--fail-on', '10'  // High threshold
      ]);

      // Should exit 0 when failures <= threshold
      expect(result.code).toBe(0);
    });

    it('test_main_prints_json_artifact_when_mcp_output_json', async () => {
      writeFileSync(TEST_CASES, JSON.stringify(validCase));

      const result = await runCLI([
        '--cases', TEST_CASES,
        '--schema', TEST_SCHEMA,
        '--out', TEST_OUT
      ], { MCP_OUTPUT: 'json' });

      // Should contain JSON artifact
      expect(result.stdout).toContain('"type"');
      expect(result.stdout).toContain('artifact');
    });
  });
});

/**
 * Helper to run the CLI and capture output
 */
function runCLI(args: string[], env: Record<string, string> = {}): Promise<{
  code: number;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve) => {
    const child = spawn('node', ['--import', 'tsx', 'src/index.ts', ...args], {
      cwd: process.cwd(),
      env: { ...process.env, ...env }
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      child.kill();
      resolve({ code: 1, stdout, stderr: stderr + '\nTimeout' });
    }, 10000);
  });
}
