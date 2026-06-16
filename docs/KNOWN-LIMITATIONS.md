# Known Limitations — `performative_empathy`

> Synthesis is a tool about honest verdicts, so it documents where its own judgment
> stops. This page describes the **accepted, deliberate limitations** of the
> `performative_empathy` checker. They are not bugs to be fixed — they are the result
> of a design decision, backed by evidence, that we stand behind.

## TL;DR

`performative_empathy` is a **detector with two states only**: `flag` (high-confidence
empathy-theater) and `not_applicable` (abstain). It has **no positive verdict**, and it
is **precision-favoring** — it will miss some real theater rather than risk wrongly
flagging a genuine reply. Both choices are intentional.

---

## Limitation 1 — It never certifies that a response *is* sincere

There is no "pass" / "genuine" / "sincere" verdict. A non-flagged response resolves to
`not_applicable` (abstain), which means *"this is not flaggable as theater"* — **not**
*"this response is good."*

**Why.** We tried to build a positive verdict and could not make it sound. Over five
adversarial-verification rounds plus a direct measurement, every candidate signal that
would distinguish a genuine engaged reply from gamed, content-free padding failed:

| Candidate signal | Why it failed |
|---|---|
| Word-class blocklists (vacuous nouns, then adjectives, then verbs…) | "Content-free" is an **open, productive class** of English — each blocklist round exposed the next (noun → adjective → verb → metaphor). Diverging, not converging. |
| Concreteness floor (Brysbaert) | Gamed **metaphor walls** (`path`/`road`/`step`) score *higher* concreteness (3.64) than a genuine reply (PE-003: 3.33); a genuine reply's novelty (`absorb`/`scares`) isn't even in the lexicon. |
| Verbatim / echo-ratio gate | A genuine reflection legitimately reuses the user's exact words (PE-004 verbatim 0.24) — the *same band* as the gamed cases (0.17–0.33). |

The conclusion is structural: **no deterministic, zero-LLM feature separates genuine
engagement from sophisticated padding for a *positive* claim.** Certifying sincerity is
exactly the kind of judgment a pattern-matcher cannot make — and the product's own
anti-thesis forbids issuing a "pass" on ambiguous evidence. So the tool refuses to make
the claim. (Adding an LLM judge would change this — but that is a *different product*;
zero-LLM determinism is a locked invariant here.)

**What this means for you.** Use a flag as a strong signal that a response is hollow
warmth. Do **not** read the absence of a flag (an N/A) as endorsement — it only means the
tool could not confidently call the response theater. In `by_check`, `performative_empathy`
shows `passed: 0` permanently by design (there is no pass state); applicable cases are
flags, everything else is N/A.

---

## Limitation 2 — It under-flags: some real theater abstains (accepted false-negatives)

The flag fires only on the *unmistakable* case: pure warmth that engages **nothing** —
high template density, near-zero particularity, and no substantive non-template content or
question. A pure-warmth wall that happens to carry a single stray substantive token (or a
question) is treated as "engaged" and **abstains instead of flagging** — even when a human
would call it hollow. The final certification reproduced a few such "missed walls."

**Why this is accepted.** The honesty contract ranks the two error types asymmetrically:

- A **false flag** on a genuine, sincere reply is the **cardinal harm** — it defames real
  care, and (per Sap et al. 2019, ACL P19-1163) surface-feature classifiers
  disproportionately misjudge brief, non-native, low-literacy, dialect, and neurodivergent
  registers. This must be **zero**.
- A **missed flag** is acceptable — the tool simply stays quiet on a case it can't call
  with confidence.

So the engagement gate is **register-neutral by construction**: any single substantive
non-template word, or a `?`, exempts a reply from flagging. That is what protects a terse
genuine reply like `"Breathe."` or a non-native `"You ok?"` — and the unavoidable price is
that a hollow reply carrying one stray token gets the same protection.

**Precision over recall, deliberately.** The certification verdict was SHIP precisely
*because* false-flags were 0 across a 71-attempt battery and fairness held; the residual
missed-flags were judged the correct trade.

### Maintainer guardrail
There is a load-bearing comment at the `engaged` gate in `src/checks/performative.ts`:
**do not lower `MIN_SUBSTANTIVE_RESIDUAL` or loosen the engagement gate to chase the missed
walls.** Doing so re-opens the cardinal false-flag harm (it would start flagging genuine
brief/non-native replies). A missed flag is acceptable; a false flag is not.

---

## What is *not* limited
- The flag itself is high-precision: it fires only when five independent conditions agree
  (warmth present, vulnerability present, enough user content, high genericness, near-zero
  particularity, sufficient margin, and no engagement signal).
- Determinism holds (same input → byte-identical output; no LLM, network, clock, or
  randomness).
- The other three checkers (`agency_language`, `unverifiable_reassurance`, `topic_pivot`)
  are unaffected by this and keep their pass/fail (and, for pivot, N/A) semantics.

## Provenance
Earned over a five-round adversarial-verification process and a final certification.
Full record: the dogfood-swarm saga and the research grounding (`study-grounding.md`).
The design lesson — *the refusal to certify sincerity is the sincerity* — is the core of
this checker.
