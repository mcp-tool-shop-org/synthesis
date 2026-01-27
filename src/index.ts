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
 *   0 - All cases passed
 *   2 - One or more failures
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

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--cases':
        if (next) options.cases = next;
        i++;
        break;
      case '--schema':
        if (next) options.schema = next;
        i++;
        break;
      case '--out':
        if (next) options.out = next;
        i++;
        break;
      case '--fail-on':
        if (next) options.failOn = parseInt(next, 10);
        i++;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
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
  0 - All cases passed (or failures <= --fail-on threshold)
  2 - Failures exceed threshold

Checks:
  agency_language           - Detects language respecting user autonomy
  unverifiable_reassurance  - Detects unfounded promises/guarantees
  topic_pivot               - Detects pivoting away from vulnerability
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
  writeReport(report, options.out);
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
