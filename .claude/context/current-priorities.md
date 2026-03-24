# Current Priorities — @mcptoolshop/synthesis

## Status

Locked (Role OS lockdown 2026-03-24). Primary seam: verdict truthfulness under ambiguity.

## Classification

Lock candidate → locked.

## Seam family

Evaluator truth — same family as any system where verdicts could project confidence they haven't earned.

## Must-preserve invariants (8)

1. **Deterministic verdicts** — same input → same output. No randomness, no model calls, no external state.
2. **Evidence trail completeness** — every verdict traces to specific pattern matches (hits, scores, similarity values). No verdict without evidence.
3. **Three-checker scope honesty** — the system checks three specific failure modes, not overall response quality. Language must reflect this.
4. **N/A is not clean** — when a checker returns N/A (e.g., no vulnerability detected), it means "not checked," not "checked and found clean."
5. **Expected failures are regression tests** — negative examples correctly failing do not count as unexpected failures. Exit code reflects this.
6. **Exit code contract** — 0 = pass/within threshold, 1 = fatal error, 2 = unexpected failures exceed threshold.
7. **Pattern-match honesty** — verdicts are regex-based pattern matching. The system does not "understand" responses, "assess empathy," or "evaluate quality."
8. **Threshold visibility** — similarity thresholds (0.45 primary, 0.30 borderline) must be documented and auditable. Changes require synchronized test/doc updates.

## Banned detours

- Adding LLM-based evaluation ("but it would catch more cases" — that's a different product)
- Framing passing verdicts as quality endorsement
- Making similarity thresholds configurable without updating all decision logic
- Removing evidence fields from output ("they're too verbose" — evidence IS the product)
- Adding "overall score" or "empathy rating" (the system doesn't rate; it detects failure modes)
