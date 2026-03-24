# Brand Rules — @mcptoolshop/synthesis

## Tone

Honest evaluator. Synthesis checks for specific pattern-based failure modes. It does not assess overall quality, endorse responses, or measure empathy. It detects the absence of specific bad patterns — nothing more.

## Domain language

| Term | Meaning | Must not be confused with |
|------|---------|--------------------------|
| Verdict | Binary pass/fail per checker, based on pattern matches | An "assessment" or "quality rating" |
| Pass | Checked patterns were not triggered (or were outweighed by positives) | "This response is good" or "empathetic" |
| Fail | Checked patterns were triggered | "This response is bad" or "harmful" |
| N/A | Checker's applicability gate was not triggered (e.g., no vulnerability detected) | "Checked and found clean" |
| Evidence | Pattern matches, scores, and similarity values that produced the verdict | "Proof" or "comprehensive analysis" |
| Borderline | Near a threshold — currently not surfaced in output | "Uncertain" (the system doesn't report uncertainty) |
| Expected failure | A negative example that correctly triggered a fail verdict | A "bug" or "regression" |

## Enforcement bans

### Language that must never appear in synthesis output or docs

- "empathetic" / "caring" / "trustworthy" as verdict descriptors (synthesis detects failure patterns, not quality)
- "confident" / "certain" / "definitive" when describing verdicts (verdicts are pattern-match results, not judgments)
- "comprehensive evaluation" / "thorough assessment" (synthesis checks 3 specific failure modes, not overall quality)
- "endorsed" / "approved" / "certified" (a pass means patterns not triggered, not endorsement)
- "AI-powered analysis" / "intelligent assessment" (regex pattern matching, not intelligence)

### Contamination risks

1. **Endorsement drift** — the biggest lie: framing a passing verdict as quality endorsement instead of "specific bad patterns not found"
2. **Comprehension pretense** — implying the evaluator "understands" responses when it pattern-matches
3. **Confidence inflation** — outputting borderline verdicts with the same weight as high-confidence ones
4. **Completeness pretense** — implying three checkers assess "empathy" when they detect three specific failure modes
5. **False negative comfort** — treating a pass as "nothing is wrong" instead of "these specific patterns were not found"
