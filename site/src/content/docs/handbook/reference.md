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

### Failure entries

Each failure includes the case ID, which checks failed, the evidence that triggered the failure, and whether the failure was expected (negative example).

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | All checks passed (within threshold) |
| `1` | Fatal error (invalid input, schema failure, missing files) |
| `2` | Unexpected failures exceed `--fail-on` threshold |

Expected failures (negative examples) never affect the exit code.

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
| **Permissions** | Read: input data. Write: stdout/stderr only |
| **Network** | None — fully offline evaluation |
| **Telemetry** | None collected or sent |
