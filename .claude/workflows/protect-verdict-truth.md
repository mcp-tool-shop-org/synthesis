# Workflow: Protect Verdict Truth

**Repo:** @mcptoolshop/synthesis
**Seam:** Verdict truthfulness under ambiguity — whether the evaluator degrades honestly or projects confidence it has not earned when evidence is partial, borderline, or structurally weak.

## What this workflow protects

The contract that every verdict is traceable to specific evidence, that borderline signals never produce confident-looking results without qualification, and that the system never claims more about a response than its pattern-matching actually determined.

## Automatic reject criteria (8)

A proposed change MUST be rejected if it:

1. **Allows missing evidence to masquerade as confidence** — produces a pass/fail verdict without corresponding pattern-match evidence in the output
2. **Collapses ambiguous findings into a clean verdict** — resolves borderline similarity (0.30-0.45 range), weak acknowledgment, or mixed signals into a binary pass/fail without indicating proximity to the threshold
3. **Presents stale or incomplete input as evaluated** — runs checks on partial cases without signaling incompleteness, or caches results without freshness checking
4. **Uses score language implying comprehension** — describes verdicts as "assessments," "evaluations of empathy," or "quality ratings" when they are pattern-match results
5. **Produces "all clear" outputs untraceable to evidence** — removes evidence fields, simplifies output to just pass/fail, or hides which patterns were checked
6. **Weakens the evidence trail** — removes hits, scores, similarity values, pattern sources, or vuln_hits from verdict output
7. **Makes human-facing reassurance stronger while leaving machine-facing semantics unchanged** — e.g., console says "all checks passed cleanly" while the report shows borderline similarity scores (org-wide reassurance drift rule)
8. **Changes threshold values or decision logic without synchronized test and documentation updates** — modifies 0.45 or 0.30 thresholds, pass conditions, or checker cascades without proving the change against test data and updating all references

## The key question this workflow answers

**When evidence is partial, stale, conflicting, or structurally weak, does the evaluator degrade honestly, or does it project confidence it has not earned?**

### Must degrade honestly
- N/A means "not checked," not "checked and clean" — output must distinguish these
- Borderline similarity (0.30-0.45) should not produce the same pass weight as high similarity (>0.60)
- Mixed signals (ack present but no follow-up, low similarity) should be visible in the evidence, not hidden behind a binary verdict
- When the pivot checker's decision logic takes the borderline path (line 227), the evidence should signal that this was a threshold-proximity pass

### Must never project
- That a passing verdict means "this response is empathetic" (it means "these patterns were not triggered")
- That three failure-mode checks constitute a comprehensive assessment
- That pattern matching is comprehension
- That N/A is the same as passing
- That a borderline pass is the same confidence level as a clear pass

## When to re-prove

Re-prove this workflow when:
- Any threshold value changes (0.45, 0.30, or new ones)
- Any pass/fail condition changes in any checker
- New checkers are added
- Evidence output fields change
- The pivot decision cascade (lines 215-234) is refactored
