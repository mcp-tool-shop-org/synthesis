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
  --cases <path>     Path to JSONL test cases      (default: data/evals.jsonl)
  --schema <path>    Path to the case JSON schema  (default: schemas/eval_case.schema.json)
  --out <path>       Output path for JSON report   (default: out/report.json)
  --fail-on <n>      Max allowed unexpected failures before exit code 2 (default: 0)
  --help, -h         Show help message
```

CLI `--schema` is the **case** schema (`schemas/eval_case.schema.json`). It does not select the report schema.

## Report format

Every run produces a structured JSON report at the configured output path (`out/report.json` by default). The published contract is `schemas/eval_report.schema.json`: JSON Schema **draft-07**, `additionalProperties: false`, required `relational_posture` on every result, with N/A enumerated in checker `state` (`not_applicable`) and `unresolved_abstain` as the N/A-is-not-clean posture.

Gold instances `schemas/report.good.json` and `schemas/report.fail.json` (mirrored under `tests/gold/`) prove **illegal-envelope polarity**: `good` must validate; `fail` must not. `fail` is an illegal envelope (extra key / missing `relational_posture`), **not** a failed eval. Checker failures belong in `failures[]` on a still-legal envelope.

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
| `label_accuracy` | How well computed results match ground-truth `expected` labels. Does not include FPR |
| `by_check` | Per-checker pass/fail/N/A breakdown |

### Additional summary fields

| Field | What It Means |
|-------|---------------|
| `label_accuracy_by_check` | Per-checker label accuracy breakdown (total, matched, accuracy percentage) |
| `fpr_brief_care` | False-positive rate on the `brief_care` genuine-care slice. Not a quality score; not folded into `label_accuracy`. N/A (`null`) when `n_brief_care` is 0 — never a numeric 0 on an empty slice |
| `fpr_dialect_like` | False-positive rate on the `dialect_like` informal-register genuine-care slice (not a demographic classifier). Not a quality score. N/A (`null`) when `n_dialect_like` is 0 |
| `n_brief_care` | Count of `brief_care`-tagged cases in this run |
| `n_dialect_like` | Count of `dialect_like`-tagged cases in this run |

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

### Grounded uptake state (grounded_uptake only)

The `grounded_uptake` checker is a positive witness: its `pass` field is **always `true`** and it never affects the exit code. The verdict lives in the `state` field:

| Value | Meaning |
|-------|---------|
| `verified_uptake` | All five witnesses present — grounded uptake was observably performed |
| `no_verified_uptake` | Applicable, but not all five witnesses were met |
| `not_applicable` | No vulnerable disclosure or fewer than two salient content words in the user message |

The five witnesses are grounded anchor (in a declarative clause), non-parroting, a support move, template containment, and safety compatibility. See [Checkers](/synthesis/handbook/checkers/) for the full definition.

### Relational posture (case-level summary)

`relational_posture` is a composed, case-level summary — not a checker. It reads the other checks' results and emits one verdict per case with `state`, `claims`, and `non_claims`. States by priority (highest severity first): `unsafe_comfort`, `hollow_warmth_flagged`, `pivot_or_abandonment`, `grounded_uptake_verified`, `unresolved_abstain`.

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

The public specifier is `@mcptoolshop/synthesis` — the package barrel (`"."`) only. Import these names from that specifier. Named checkers (`checkAgency`, `checkReassurance`, `checkPivot`, `checkPerformativeEmpathy`, `checkGroundedUptake`) and similarity helpers (`tokenCosineSimilarity`, `extractAnchor`, `setEmbeddingAdapter`, `EmbeddingAdapter`) are **internal**. Import the barrel runner; do not deep-import `checks/*`.

```ts
import {
  loadCases,
  validateCase,
  runCase,
  runAllCases,
  writeReport,
  printSummary,
  formatArtifact,
  computeRelationalPosture,
  SUMMARY_FOIL,
} from '@mcptoolshop/synthesis';
import type { EvalCase, CheckType, EvalReport, CLIOptions } from '@mcptoolshop/synthesis';
```

| Export | Purpose |
|--------|---------|
| `loadCases(casesPath, schemaPath)` | Load and validate JSONL eval cases against the case JSON schema |
| `validateCase(evalCase, schemaPath)` | Validate a single case object (useful for testing) |
| `runCase(evalCase)` | Run all requested checks on a single eval case |
| `runAllCases(cases)` | Run all cases and compute aggregate metrics |
| `writeReport(report, outputPath)` | Write the JSON report to disk |
| `printSummary(report)` | Print a formatted summary to the console |
| `formatArtifact(report, outputPath)` | Format the report as an MCP-style artifact object |
| `computeRelationalPosture(checks)` | Compose a case-level posture summary from the other checks' results |
| `SUMMARY_FOIL` | Shared TTY legend string for claims / non_claims |
| Types: `EvalCase`, `CheckType`, `EvalReport`, `CLIOptions` | Public TypeScript types from the barrel |

Internal (not on `"."`): `checkAgency`, `checkReassurance`, `checkPivot`, `checkPerformativeEmpathy`, `checkGroundedUptake`, `tokenCosineSimilarity`, `extractAnchor`, `setEmbeddingAdapter`, `EmbeddingAdapter`.

## Project structure

```
synthesis/
  data/
    evals.jsonl              # GREEN pack — npm run eval / npm run verify
    planted-theater.jsonl    # Planted RED pack — npm run eval:planted only; do not mix into evals.jsonl
  schemas/
    eval_case.schema.json    # Case JSON Schema (CLI --schema)
    eval_report.schema.json  # Published report contract (draft-07)
    report.good.json         # Gold: legal envelope
    report.fail.json         # Gold: illegal envelope (not a failed eval)
  docs/
    KNOWN-LIMITATIONS.md     # What the checkers do and do not certify
    study-grounding.md       # Research grounding for the checker designs
  src/
    index.ts                 # CLI entry point and public barrel
    load.ts                  # JSONL loader + AJV schema validation
    runner.ts                # Runs checks, computes metrics
    report.ts                # JSON report + console summary
    relational.ts            # Composed case-level posture summary
    types.ts                 # TypeScript type definitions
    checks/
      agency.ts              # Agency language checker (internal)
      reassurance.ts         # Unverifiable reassurance checker (internal)
      pivot.ts               # Topic pivot checker (internal)
      performative.ts        # Performative-empathy detector (internal)
      grounded_uptake.ts     # Grounded-uptake positive witness (internal)
      similarity.ts          # Token cosine similarity (internal)
  out/
    report.json              # Generated report (gitignored)
```

`npm run eval` and `npm run verify` stay GREEN against `data/evals.jsonl`. `npm run eval:planted` is inverted CI: every planted row must stay RED (schema-invalid or theater-flagged). Do not mix planted RED rows into `data/evals.jsonl`.

## Security

| Aspect | Detail |
|--------|--------|
| **Data touched** | Conversation transcripts as input, eval results as JSON output |
| **Data NOT touched** | No telemetry, no analytics, no network calls, no credentials |
| **Permissions** | Read: input data. Write: JSON report to configured output path, stdout/stderr |
| **Network** | None — fully offline evaluation |
| **Telemetry** | None collected or sent |
