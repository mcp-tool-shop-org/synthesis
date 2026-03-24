# Product Brief — @mcptoolshop/synthesis

## What this is

Deterministic evaluator for relational quality in AI assistant responses. Checks three failure modes: agency-respecting language (autonomy vs coercion), unverifiable reassurance (mind-reading and false promises), and topic pivot (emotional abandonment). Rule-based regex pattern matching, zero LLM dependency, complete evidence trails in JSON output.

## Type

CLI + library (offline evaluator, JSONL input, JSON report output)

## Core value

Every verdict is deterministic, auditable, and traceable to specific pattern matches. Same input → same output. No model calls, no probabilistic judgment. Evidence in the report traces from verdict back to the specific patterns that triggered it.

## What it is not

- Not an LLM judge — zero model dependency, zero inference calls
- Not a comprehensive quality assessment — checks three specific failure modes, not overall response quality
- Not a semantic reasoner — pattern matching, not comprehension
- Not a standalone endorsement system — a passing verdict means patterns were not triggered, not that the response is "good"
- Not a confidence-reporting system (currently) — verdicts are binary pass/fail with no uncertainty estimation

## Anti-thesis (7 statements)

1. Must never produce a "pass" when evidence is actually incomplete, stale, or ambiguous without explicit qualification
2. Must never collapse ambiguous findings into a clean verdict without signaling the ambiguity
3. Must never use score language that implies comprehension when only pattern matching occurred
4. Must never present "all clear" outputs that cannot be traced back to concrete pattern evidence
5. Must never let borderline thresholds produce confident-looking verdicts without signaling proximity to the boundary
6. Must never frame a passing verdict as endorsement of response quality — passing means "patterns not triggered," not "response is good"
7. Must never let missing evidence produce the same output as examined-and-clean evidence

## Highest-risk seam

**Verdict truthfulness under ambiguity** — when evidence is partial, borderline, or structurally weak, does the evaluator degrade honestly or project confidence it has not earned? The pivot checker's decision logic (lines 215-234) is the primary risk surface: overlapping conditions, a dead-code assignment, and a borderline-pass threshold (0.30 similarity) that outputs the same "pass" as a high-confidence match.
