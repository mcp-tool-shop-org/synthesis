# Repo Map — @mcptoolshop/synthesis

## Stack

- TypeScript (Node.js), 2 runtime dependencies (ajv, ajv-formats)
- 9 source modules + schema + test data
- Vitest test runner (8 test suites)
- Single entry: CLI (`dist/index.js`)

## Module architecture

| Module | Purpose | I/O? |
|--------|---------|------|
| `index.ts` | CLI entry, arg parsing, orchestration | Yes (file reads, stdout, exit codes) |
| `types.ts` | EvalCase, CheckResult, EvalReport interfaces | No |
| `load.ts` | JSONL loader with AJV schema validation | Yes (file read) |
| `runner.ts` | Run checks on cases, aggregate metrics, label comparison | No |
| `report.ts` | JSON report generation and console summary | Yes (file write, stdout) |
| `checks/agency.ts` | Agency language checker (31 positive + 17 negative patterns) | No |
| `checks/reassurance.ts` | Reassurance checker (13 mind-reading + 18 guarantee patterns) | No |
| `checks/pivot.ts` | Pivot checker (51 vulnerability + 29 ack + 14 follow-up + 4 pivot patterns) | No |
| `checks/similarity.ts` | Token cosine similarity (bag-of-words unigrams + bigrams) | No |

## Primary seam: Verdict truthfulness under ambiguity

### Three checkers, three verdict models

| Checker | Pass condition | Evidence | Ambiguity handling |
|---------|---------------|----------|--------------------|
| agency_language | `score >= 1` OR (`pos >= 1` AND `neg == 0`) | score, pos_hits, neg_hits | Net-score model — mixed signals produce lower scores |
| unverifiable_reassurance | `mind_reading_hits == 0` AND `guarantee_hits == 0` | hits, mind_reading_hits, guarantee_hits | All-or-nothing — single hit fails |
| topic_pivot | Multi-condition cascade (lines 215-234) | applicable, anchor_similarity, ack_present, vuln_hits, ack_hits | **PROBLEMATIC** — borderline signals produce confident-looking "pass" |

### Pivot decision logic (the critical path)

```
Lines 218-234 of pivot.ts:

if pivot_indicator AND similarity < 0.45:
    FAIL  (clear — explicit pivot + low similarity)
elif ack AND follow_up:
    PASS  (clear — engaged properly)
elif similarity >= 0.45:
    PASS  (clear — staying on topic)
elif ack AND !pivot_indicator AND similarity >= 0.30:
    PASS  (BORDERLINE — weak similarity, bare ack, no follow-up)
else:
    [DEAD CODE on line 232, overwritten by line 233]
    pass = hasAck ? (hasFollowUp || sim >= 0.45) : (sim >= 0.45)
```

### Truth concern: line 232 is dead code

`pass = !hasAck ? true : false;` is immediately overwritten by line 233. The comment says "No ack but no vuln engagement" but we are inside a branch where vulnerability IS detected. This dead-code assignment suggests the logic was refactored and the old path was not cleaned up.

### Contract surfaces

| Surface | Location | Risk |
|---------|----------|------|
| Pivot borderline threshold (0.30) | `pivot.ts:227` | **HIGH** — 0.31 and 0.80 similarity both output "pass" with same confidence |
| Pivot dead-code path | `pivot.ts:232-233` | **HIGH** — confusing, may mask logic bugs |
| Agency pass condition | `agency.ts:98-113` | **LOW** — clear net-score model |
| Reassurance single-hit fail | `reassurance.ts` | **LOW** — conservative, correct |
| Exit code 2 threshold | `index.ts` | **LOW** — only unexpected failures drive it |
| Label accuracy computation | `runner.ts` | **LOW** — optional, truthful |

## Validation

- `npm test` — Vitest (8 suites, ~60 tests, **13 currently failing** — test import/export mismatches indicate code drift)
- `npm run build` — TypeScript compilation
- `npm run eval` — Run evaluation on bundled test data
