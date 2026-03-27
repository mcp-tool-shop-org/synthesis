---
title: Reference
description: CLI options, report format, and project architecture.
sidebar:
  order: 5
---

## CLI options

```
synthesis [options]

Options:
  --cases <path>     Path to JSONL test cases     (default: data/evals.jsonl)
  --schema <path>    Path to JSON schema           (default: schemas/eval_case.schema.json)
  --out <path>       Output path for JSON report   (default: out/report.json)
  --fail-on <n>      Max allowed unexpected failures before exit code 2 (default: 0)
  --help, -h         Show help message
```

## Report format

Every run produces a structured JSON report at the configured output path.

### Summary fields

| Field | What It Means |
|-------|---------------|
| `cases` | Total number of eval cases processed |
| `passed` | Cases where all checks passed |
| `failed` | Cases where at least one check failed |
| `strict_passed` | Cases that passed and were not expected to fail |
| `strict_failed` | Unexpected failures — regressions |
| `expected_failures` | Negative examples correctly caught |
| `unexpected_failures` | Same as `strict_failed` — drives exit code |
| `label_accuracy` | How well computed results match ground-truth `expected` labels |
| `by_check` | Per-checker pass/fail/N/A breakdown |

### Additional summary fields

| Field | What It Means |
|-------|---------------|
| `label_accuracy_by_check` | Per-checker label accuracy breakdown (total, matched, accuracy percentage) |

### Failure entries

Each failure includes the case ID, which checks failed, the evidence that triggered the failure, and whether the failure was expected (negative example).

### Pass strength (topic_pivot only)

The `topic_pivot` checker includes a `pass_strength` field on every result:

| Value | Meaning |
|-------|---------|
| `clear_pass` | Strong engagement signals (acknowledgment + follow-up, or high similarity) |
| `borderline_pass` | Acknowledgment present with moderate similarity but no explicit follow-up |
| `clear_fail` | Insufficient engagement with the user's vulnerability |
| `not_applicable` | No vulnerability detected in the user message |

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | All checks passed (within threshold) |
| `1` | Fatal error (invalid input, schema failure, missing files) |
| `2` | Unexpected failures exceed `--fail-on` threshold |

Expected failures (negative examples) never affect the exit code.

## Environment variables

| Variable | Effect |
|----------|--------|
| `MCP_OUTPUT=json` | Prints an MCP-style artifact object to stdout after the summary. Useful for tool integrations that consume structured output. |

## Exported API

Synthesis exports the following functions from its source modules. These are useful when integrating Synthesis programmatically rather than through the CLI.

| Module | Export | Purpose |
|--------|--------|---------|
| `load` | `loadCases(casesPath, schemaPath)` | Load and validate JSONL eval cases against a JSON schema |
| `load` | `validateCase(evalCase, schemaPath)` | Validate a single case object (useful for testing) |
| `runner` | `runCase(evalCase)` | Run all checks on a single eval case |
| `runner` | `runAllCases(cases)` | Run all cases and compute aggregate metrics |
| `report` | `writeReport(report, outputPath)` | Write the JSON report to disk |
| `report` | `printSummary(report)` | Print a formatted summary to the console |
| `report` | `formatArtifact(report, outputPath)` | Format the report as an MCP-style artifact object |
| `checks/agency` | `checkAgency(assistantText)` | Run the agency language checker on a single response |
| `checks/reassurance` | `checkReassurance(assistantText)` | Run the reassurance checker on a single response |
| `checks/pivot` | `checkPivot(userText, assistantText)` | Run the topic pivot checker on a conversation pair |
| `checks/similarity` | `tokenCosineSimilarity(text1, text2)` | Compute bag-of-words cosine similarity between two texts |
| `checks/similarity` | `extractAnchor(text, maxSentences)` | Extract the first N sentences from a response |
| `checks/similarity` | `setEmbeddingAdapter(adapter)` | Replace the default similarity engine with a custom adapter |

## Project structure

```
synthesis/
  data/
    evals.jsonl              # Bundled test cases
  schemas/
    eval_case.schema.json    # JSON Schema for case validation
  src/
    index.ts                 # CLI entry point
    load.ts                  # JSONL loader + AJV schema validation
    runner.ts                # Runs checks, computes metrics
    report.ts                # JSON report + console summary
    types.ts                 # TypeScript type definitions
    checks/
      agency.ts              # Agency language checker
      reassurance.ts         # Unverifiable reassurance checker
      pivot.ts               # Topic pivot checker
      similarity.ts          # Token cosine similarity
  out/
    report.json              # Generated report (gitignored)
```

## Security

| Aspect | Detail |
|--------|--------|
| **Data touched** | Conversation transcripts as input, eval results as JSON output |
| **Data NOT touched** | No telemetry, no analytics, no network calls, no credentials |
| **Permissions** | Read: input data. Write: JSON report to configured output path, stdout/stderr |
| **Network** | None — fully offline evaluation |
| **Telemetry** | None collected or sent |
