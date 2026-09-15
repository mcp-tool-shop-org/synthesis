#!/usr/bin/env node
/**
 * Synthesis CLI
 *
 * Deterministic evaluations for empathy, trust, and care in AI systems
 *
 * Usage:
 *   npm run eval
 *   node dist/index.js --cases data/evals.jsonl --schema schemas/eval_case.schema.json --out out/report.json
 *
 * Exit codes:
 *   0 - All cases passed (or failures <= --fail-on threshold)
 *   1 - Fatal load/runtime error (bad args, unreadable cases, unwritable output)
 *   2 - One or more unexpected failures (exceed --fail-on threshold)
 *
 * This module is also the package barrel. Importing it as a library must not
 * run the CLI or call process.exit — main() is gated on isDirectRun().
 */

import { resolve } from 'node:path';
import { realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadCases, validateCase } from './load.js';
import { runCase, runAllCases } from './runner.js';
import { writeReport, printSummary, formatArtifact, SUMMARY_FOIL } from './report.js';
import { computeRelationalPosture } from './relational.js';
import { hasColors } from './color.js';
import type { CLIOptions, EvalReport } from './types.js';

export {
  loadCases,
  validateCase,
  runCase,
  runAllCases,
  writeReport,
  printSummary,
  formatArtifact,
  computeRelationalPosture,
  SUMMARY_FOIL,
};
export type { EvalCase, CheckType, EvalReport, CLIOptions } from './types.js';

function isJsonOutput(): boolean {
  return (process.env.MCP_OUTPUT ?? '').toLowerCase() === 'json';
}

/** Fatal CLI path: details on stderr; JSON error object on stdout when JSON mode. */
function failFatal(message: string, extra?: unknown): never {
  if (extra !== undefined) {
    console.error(message, extra);
  } else {
    console.error(message);
  }
  if (isJsonOutput()) {
    console.log(JSON.stringify({ error: true, message }));
  }
  process.exit(1);
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    cases: 'data/evals.jsonl',
    schema: 'schemas/eval_case.schema.json',
    out: 'out/report.json',
    failOn: 0,
    explain: false,
    noColor: false
  };

  // Require a present, non-flag value for a value-taking flag. A missing value
  // or one that starts with '--' (i.e. the next flag) is a usage error.
  const requireValue = (flag: string, value: string | undefined): string => {
    if (value === undefined || value.startsWith('--')) {
      failFatal(`${flag} requires a value`);
    }
    return value;
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--cases':
        options.cases = requireValue('--cases', next);
        i++;
        break;
      case '--schema':
        options.schema = requireValue('--schema', next);
        i++;
        break;
      case '--out':
        options.out = requireValue('--out', next);
        i++;
        break;
      case '--fail-on': {
        const value = requireValue('--fail-on', next);
        // Strict: reject NaN, negative, fractional, and trailing-garbage like "2x".
        // An invalid threshold would otherwise make the exit gate (`unexpected > NaN`)
        // always false, silently passing regressions.
        const n = Number(value);
        if (!Number.isInteger(n) || n < 0) {
          failFatal('--fail-on must be a non-negative integer');
        }
        options.failOn = n;
        i++;
        break;
      }
      case '--explain':
        options.explain = true;
        break;
      case '--no-color':
        options.noColor = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        // Reject unknown flags so typos surface instead of silently using defaults.
        if (arg.startsWith('-')) {
          failFatal(`Unknown option: ${arg}`);
        }
        // Bare positional args are not supported; flag them too.
        failFatal(`Unexpected argument: ${arg}`);
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp(): void {
  const text = `
Synthesis - Deterministic Empathy Evaluations

Usage:
  npm run eval [options]
  node dist/index.js [options]

Options:
  --cases <path>     Path to JSONL file with test cases (default: data/evals.jsonl)
  --schema <path>    Path to JSON schema (default: schemas/eval_case.schema.json)
  --out <path>       Output path for report (default: out/report.json)
  --fail-on <n>      Maximum allowed failures before exit code 2 (default: 0)
  --explain          Extra foil: dump per-case claims and non_claims (limits also print on the default TTY)
  --no-color         Disable ANSI color and use ASCII glyphs (also honors NO_COLOR, FORCE_COLOR=0, TERM=dumb)
  --help, -h         Show this help message

Exit Codes:
  0 - All cases passed (or unexpected failures <= --fail-on threshold)
  1 - Fatal error (bad JSONL, schema failure, missing/unwritable files)
  2 - Unexpected failures exceed threshold

Legend:
  ${SUMMARY_FOIL}

Checks:
  agency_language           - Detects language respecting user autonomy
  unverifiable_reassurance  - Detects unfounded promises/guarantees
  topic_pivot               - Detects pivoting away from vulnerability
  performative_empathy      - Flags empathy-theater (detector; never certifies sincerity)
  grounded_uptake           - Verifies observable grounded uptake (the positive witness)

Each case is also summarized as a relational_posture (TTY and results[].relational_posture)
with claims and non_claims. Default TTY prints non_claims; --explain is extra, not the only honesty surface.
`;
  // JSON mode keeps stdout for machine artifacts; help is human text on stderr.
  if (isJsonOutput()) {
    console.error(text);
  } else {
    console.log(text);
  }
}

function hrefsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  if (process.platform === 'win32') return a.toLowerCase() === b.toLowerCase();
  return false;
}

function realOrResolve(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
}

/**
 * True when this file is the process entry point (CLI / bin), false when
 * imported as a library. realpath both argv[1] and import.meta.url so a
 * symlink / junction / /tmp→/private/tmp mismatch still counts as a direct
 * run. On parse/compare failure, log to stderr (no silent exit 0) and fall
 * back to resolved-path equality; if that also throws, exit 1.
 */
function isDirectRun(): boolean {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  try {
    const rawEntry = argv1.startsWith('file:') ? fileURLToPath(argv1) : argv1;
    const rawSelf = fileURLToPath(import.meta.url);
    const entryHref = pathToFileURL(realOrResolve(rawEntry)).href;
    const selfHref = pathToFileURL(realOrResolve(rawSelf)).href;
    return hrefsMatch(entryHref, selfHref);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`synthesis: CLI entry guard failed (${msg})`);
    try {
      const rawEntry = argv1.startsWith('file:') ? fileURLToPath(argv1) : argv1;
      const rawSelf = fileURLToPath(import.meta.url);
      return hrefsMatch(resolve(rawEntry), resolve(rawSelf));
    } catch {
      process.exit(1);
    }
  }
}

/** Human banners/logs: stdout normally; stderr when stdout must be JSON-only. */
function cliLog(...args: unknown[]): void {
  if (isJsonOutput()) {
    console.error(...args);
  } else {
    console.log(...args);
  }
}

function emitSummary(report: EvalReport, explain: boolean, color: boolean): void {
  if (isJsonOutput()) {
    printSummary(report, console.error, color, { explain });
    return;
  }
  printSummary(report, console.log, color, { explain });
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  cliLog('Synthesis - Deterministic Empathy Evaluations');
  cliLog(`Loading cases from: ${options.cases}`);
  cliLog(`Using schema: ${options.schema}`);

  // Load and validate cases
  let cases;
  try {
    cases = loadCases(options.cases, options.schema);
    cliLog(`Loaded ${cases.length} cases`);
  } catch (error) {
    failFatal(`Failed to load cases: ${(error as Error).message}`);
  }

  // Run all evaluations
  cliLog('Running evaluations...');
  const { results, failures, summary } = runAllCases(cases);

  // Build report
  const report: EvalReport = {
    summary,
    failures,
    results
  };

  // Write output
  try {
    writeReport(report, options.out);
  } catch (e) {
    failFatal(`Failed to write report: ${(e as Error).message}`);
  }
  cliLog(`Report written to: ${options.out}`);

  const colorStream = isJsonOutput() ? process.stderr : process.stdout;
  const color = options.noColor ? false : hasColors(colorStream);
  emitSummary(report, options.explain, color);

  // MCP_OUTPUT=json: stdout is ONLY the artifact so JSON.parse(stdout) works.
  const artifact = formatArtifact(report, options.out);
  if (isJsonOutput()) {
    console.log(JSON.stringify(artifact));
  }

  // Exit code based on UNEXPECTED failures only
  // Expected failures (negative examples) are regression tests and don't count against the threshold
  const unexpectedCount = summary.unexpected_failures;
  if (unexpectedCount > options.failOn) {
    cliLog(`Exiting with code 2 (${unexpectedCount} unexpected failures > ${options.failOn} threshold)`);
    process.exit(2);
  }

  if (unexpectedCount > 0) {
    cliLog(`Exiting 0: ${unexpectedCount} unexpected failures <= --fail-on ${options.failOn}`);
  } else if (summary.expected_failures > 0) {
    cliLog(`All checks passed! (${summary.expected_failures} expected failures correctly caught)`);
  } else {
    cliLog('All checks passed!');
  }
  process.exit(0);
}

if (isDirectRun()) {
  main().catch(error => {
    const message = error instanceof Error ? error.message : String(error);
    failFatal(`Fatal error: ${message}`, error);
  });
}
