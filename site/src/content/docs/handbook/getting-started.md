---
title: Getting Started
description: Install Synthesis and run your first deterministic eval.
sidebar:
  order: 1
---

Synthesis is a deterministic eval framework that catches relational failure modes in AI assistant responses. No LLM judge, no probabilistic scoring — just rule-based pattern matching that produces auditable evidence.

## Installation

From npm:

```bash
npm install @mcptoolshop/synthesis
```

Or clone and build from source:

```bash
git clone https://github.com/mcp-tool-shop-org/synthesis.git
cd synthesis
npm install
npm run build
```

## Run your first eval

The quickest way to see Synthesis in action:

```bash
npm run build
npm run eval
```

This loads the bundled test cases from `data/evals.jsonl`, runs all three checkers, and writes a JSON report to `out/report.json`.

Exit code `0` means no unexpected failures.

## Development mode

For faster iteration without a build step:

```bash
npm run dev
```

## What happens during an eval

1. **Load** — Synthesis reads your JSONL test cases and validates each one against the JSON schema
2. **Check** — Each case runs through the checkers specified in its `checks` array
3. **Compare** — If `expected` labels are provided, computed results are compared against ground truth
4. **Report** — A structured JSON report is written with per-case results, evidence, and aggregate metrics

## Next steps

- Learn how the [checkers](/synthesis/handbook/checkers/) work under the hood
- Write your own [test cases](/synthesis/handbook/test-cases/)
- Set up [CI integration](/synthesis/handbook/ci/) for automated empathy regression testing
