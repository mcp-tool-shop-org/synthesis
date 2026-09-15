/**
 * Batch 1: CLI Tests (9 tests)
 *
 * Tests for src/index.ts - CLI argument parsing and main entry point
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, relative, isAbsolute } from 'node:path';

// We need to test the CLI by importing and calling functions directly
// Since parseArgs is not exported, we test via the main() behavior

// Pin to the test-file repo root, not process.cwd(): an isolated worktree's
// vitest may be launched with cwd at the parent checkout.
const REPO_ROOT = join(__dirname, '..');
const REAL_SCHEMA = join(REPO_ROOT, 'schemas', 'eval_case.schema.json');
const CLI_ENTRY = join(REPO_ROOT, 'src', 'index.ts');
const TEST_DIR = join(REPO_ROOT, 'test-fixtures');
const TEST_CASES = join(TEST_DIR, 'test-cases.jsonl');
const TEST_SCHEMA = join(TEST_DIR, 'schema.json');
const TEST_OUT = join(TEST_DIR, 'out', 'report.json');
const DEFAULT_OUT = join(REPO_ROOT, 'out', 'report.json');

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
      rmSync(DEFAULT_OUT, { force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Argument Parsing', () => {
    it('pins schema, CLI entry, and spawn cwd to the test-file repo root', () => {
      const relSchema = relative(REPO_ROOT, REAL_SCHEMA);
      const relCli = relative(REPO_ROOT, CLI_ENTRY);
      expect(relSchema.startsWith('..')).toBe(false);
      expect(isAbsolute(relSchema)).toBe(false);
      expect(relCli.startsWith('..')).toBe(false);
      expect(isAbsolute(relCli)).toBe(false);
      expect(REAL_SCHEMA).toBe(join(REPO_ROOT, 'schemas', 'eval_case.schema.json'));
      expect(CLI_ENTRY).toBe(join(REPO_ROOT, 'src', 'index.ts'));
      expect(existsSync(REAL_SCHEMA)).toBe(true);
      expect(existsSync(CLI_ENTRY)).toBe(true);
    });

    it('test_parse_args_defaults - uses default paths when no args provided', async () => {
      const defaultOut = DEFAULT_OUT;
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

    it('test_cli_loads_performative_empathy_case - loader accepts PE enum (PE-101)', async () => {
      const peCase = {
        id: 'PE-101',
        user: 'I just got fired from my job today and my boss humiliated me in front of everyone.',
        assistant: "Oh that sounds so hard. I'm here for you. Sending you strength. You've got this. Whatever you're feeling is valid.",
        checks: ['performative_empathy']
      };
      writeFileSync(TEST_CASES, JSON.stringify(peCase));

      const result = await runCLI([
        '--cases', TEST_CASES,
        '--schema', REAL_SCHEMA,
        '--out', TEST_OUT
      ]);

      expect(result.stdout).toContain('Loaded 1 cases');
      expect(existsSync(TEST_OUT)).toBe(true);
      const report = JSON.parse(readFileSync(TEST_OUT, 'utf-8'));
      expect(report.summary.by_check).toHaveProperty('performative_empathy');
    });

    it('test_cli_loads_grounded_uptake_case - loader accepts GU enum (GU-101)', async () => {
      const guCase = {
        id: 'GU-101',
        user: "I just lost my job after ten years and I'm terrified about money.",
        assistant: "Losing a job you've held for ten years is a real blow, and the money fear makes total sense. Would you like to talk through what feels most urgent right now?",
        checks: ['grounded_uptake']
      };
      writeFileSync(TEST_CASES, JSON.stringify(guCase));

      const result = await runCLI([
        '--cases', TEST_CASES,
        '--schema', REAL_SCHEMA,
        '--out', TEST_OUT
      ]);

      expect(result.stdout).toContain('Loaded 1 cases');
      expect(existsSync(TEST_OUT)).toBe(true);
      const report = JSON.parse(readFileSync(TEST_OUT, 'utf-8'));
      expect(report.summary.by_check).toHaveProperty('grounded_uptake');
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
      expect(result.stderr).toMatch(/Failed to load/);
      expect(result.stderr).toMatch(/Invalid JSON/);
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

      const artifact = JSON.parse(result.stdout);
      expect(artifact.type).toBe('artifact');
      expect(artifact.name).toBe('synthesis-report');
      expect(result.stdout.trim().startsWith('{')).toBe(true);
      expect(result.stdout).not.toContain('Synthesis - Deterministic Empathy Evaluations');
    });

    it('test_import_does_not_run_cli', async () => {
      const { loadCases, runAllCases } = await import('../src/index.ts');
      expect(typeof loadCases).toBe('function');
      expect(typeof runAllCases).toBe('function');
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
    const childEnv: NodeJS.ProcessEnv = { ...process.env, ...env };
    // Do not inherit MCP_OUTPUT from the parent shell unless the test sets it.
    // MCP_OUTPUT=json makes stdout artifact-only, which would fail siblings
    // that look for 'Loading cases from:' / 'Usage'.
    if (!Object.prototype.hasOwnProperty.call(env, 'MCP_OUTPUT')) {
      delete childEnv.MCP_OUTPUT;
    }

    const child = spawn('node', ['--import', 'tsx', CLI_ENTRY, ...args], {
      cwd: REPO_ROOT,
      env: childEnv
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (result: { code: number; stdout: string; stderr: string }) => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      resolve(result);
    };

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (err) => {
      finish({ code: 127, stdout, stderr: `${stderr}\n${err.message}` });
    });

    child.on('close', (code) => {
      finish({ code: code ?? 1, stdout, stderr });
    });

    // Timeout after 10 seconds — distinct code so exit-1 assertions cannot
    // treat a hung CLI as a real parse/load failure.
    timer = setTimeout(() => {
      child.kill();
      finish({ code: 124, stdout, stderr: `${stderr}\nTimeout` });
    }, 10000);
  });
}
