---
title: CI Integration
description: Add Synthesis to your CI pipeline for automated empathy regression testing.
sidebar:
  order: 4
---

Synthesis is designed to drop into CI pipelines. Deterministic results, structured reports, and meaningful exit codes make it straightforward to gate deployments on empathy quality.

## Basic GitHub Actions workflow

```yaml
name: Empathy Eval
on:
  push:
    paths:
      - 'data/**'
      - 'src/**'
      - 'schemas/**'
      - 'tests/**'
      - 'scripts/**'

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run verify          # GREEN on data/evals.jsonl
      - run: npm run eval:planted    # inverted; data/planted-theater.jsonl must stay RED
```

The verify step (test + build + eval) stays GREEN on `data/evals.jsonl` and exits with code `2` if `unexpected_failures > 0`, which fails the CI job. Expected failures (negative examples) do not affect the exit code.

`npm run eval:planted` is inverted CI against `data/planted-theater.jsonl`: it must exit non-zero if any planted row is GREEN. Do **not** mix planted RED rows into `data/evals.jsonl`.

## Failure threshold

During early development, you may want to allow some failures while you improve coverage:

```bash
node dist/index.js --fail-on 3
```

This allows up to 3 unexpected failures before the exit code flips to `2`.

## Report artifacts

Upload the JSON report as a CI artifact for post-run analysis:

```yaml
- run: npm run eval
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: synthesis-report
    path: out/report.json
```

The `if: always()` ensures the report is uploaded even when the eval fails — which is exactly when you need it most.

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | All checks passed (unexpected failures within threshold) |
| `1` | Fatal error (invalid JSONL, schema failure, missing files) |
| `2` | Unexpected failures exceed `--fail-on` threshold |
