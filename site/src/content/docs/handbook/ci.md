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
    paths: ['data/**', 'src/**', 'schemas/**']

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run eval
```

The eval step exits with code `2` if `unexpected_failures > 0`, which fails the CI job. Expected failures (negative examples) do not affect the exit code.

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
