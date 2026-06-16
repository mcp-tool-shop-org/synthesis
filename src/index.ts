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
 */

import { loadCases } from './load.js';
import { runAllCases } from './runner.js';
import { writeReport, printSummary, formatArtifact } from './report.js';
import type { CLIOptions, EvalReport } from './types.js';

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    cases: 'data/evals.jsonl',
    schema: 'schemas/eval_case.schema.json',
    out: 'out/report.json',
    failOn: 0
  };

  // Require a present, non-flag value for a value-taking flag. A missing value
  // or one that starts with '--' (i.e. the next flag) is a usage error.
  const requireValue = (flag: string, value: string | undefined): string => {
    if (value === undefined || value.startsWith('--')) {
      console.error(`${flag} requires a value`);
      process.exit(1);
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
          console.error('--fail-on must be a non-negative integer');
          process.exit(1);
        }
        options.failOn = n;
        i++;
        break;
      }
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        // Reject unknown flags so typos surface instead of silently using defaults.
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
        // Bare positional args are not supported; flag them too.
        console.error(`Unexpected argument: ${arg}`);
        process.exit(1);
    }
  }

  return options;
}

/**
 * Print help message
 */
function printHelp(): void {
  console.log(`
Synthesis - Deterministic Empathy Evaluations

Usage:
  npm run eval [options]
  node dist/index.js [options]

Options:
  --cases <path>     Path to JSONL file with test cases (default: data/evals.jsonl)
  --schema <path>    Path to JSON schema (default: schemas/eval_case.schema.json)
  --out <path>       Output path for report (default: out/report.json)
  --fail-on <n>      Maximum allowed failures before exit code 2 (default: 0)
  --help, -h         Show this help message

Exit Codes:
  0 - All cases passed (or unexpected failures <= --fail-on threshold)
  1 - Fatal error (bad JSONL, schema failure, missing/unwritable files)
  2 - Unexpected failures exceed threshold

Checks:
  agency_language           - Detects language respecting user autonomy
  unverifiable_reassurance  - Detects unfounded promises/guarantees
  topic_pivot               - Detects pivoting away from vulnerability
  performative_empathy      - Flags empathy-theater (detector; never certifies sincerity)
  grounded_uptake           - Verifies observable grounded uptake (the positive witness)

Each case is also summarized as a relational_posture (results[].relational_posture)
with claims and non_claims.
`);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  console.log('Synthesis - Deterministic Empathy Evaluations');
  console.log(`Loading cases from: ${options.cases}`);
  console.log(`Using schema: ${options.schema}`);

  // Load and validate cases
  let cases;
  try {
    cases = loadCases(options.cases, options.schema);
    console.log(`Loaded ${cases.length} cases`);
  } catch (error) {
    console.error('\nFailed to load cases:', (error as Error).message);
    process.exit(1);
  }

  // Run all evaluations
  console.log('Running evaluations...');
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
    console.error('\nFailed to write report:', (e as Error).message);
    process.exit(1);
  }
  console.log(`Report written to: ${options.out}`);

  // Print summary
  printSummary(report);

  // MCP-style artifact output (for tool integration)
  const artifact = formatArtifact(report, options.out);
  if (process.env.MCP_OUTPUT === 'json') {
    console.log(JSON.stringify(artifact, null, 2));
  }

  // Exit code based on UNEXPECTED failures only
  // Expected failures (negative examples) are regression tests and don't count against the threshold
  const unexpectedCount = summary.unexpected_failures;
  if (unexpectedCount > options.failOn) {
    console.log(`Exiting with code 2 (${unexpectedCount} unexpected failures > ${options.failOn} threshold)`);
    process.exit(2);
  }

  if (summary.expected_failures > 0) {
    console.log(`All checks passed! (${summary.expected_failures} expected failures correctly caught)`);
  } else {
    console.log('All checks passed!');
  }
  process.exit(0);
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
