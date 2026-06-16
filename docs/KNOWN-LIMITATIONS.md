# Known Limitations

> Synthesis is a tool about honest verdicts, so it documents where its own judgment
> stops. This page describes **accepted, deliberate limitations** — not bugs to be fixed,
> but design decisions backed by evidence that we stand behind.
>
> Two checkers carry limitations worth stating plainly:
> - **`performative_empathy`** (Limitations 1–2 below) — the negative detector that refuses
>   to certify sincerity.
> - **`grounded_uptake`** (final section) — the positive witness that certifies *observable
>   grounded uptake* and nothing more.

## `performative_empathy`

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

---

# `grounded_uptake`

`grounded_uptake` is the positive companion: instead of certifying sincerity (which is
impossible deterministically), it certifies the **narrower, observable** claim that *grounded
uptake was performed*. That narrowing is exactly what keeps it honest — and it defines a precise
boundary of what `verified_uptake` does and does **not** mean. The limits below were earned from a
54-candidate adversarial red-team (see the red-team saga) and are pinned by regression tests.

## What `verified_uptake` certifies — and only this
A response earned `verified_uptake` iff ALL of: it made a grounded, **non-parroted statement**
about the user's specific situation (a declarative clause, not a topic word inside a question);
it made a **support move** (question / offer / interpretation); warmth did not dominate; and it
was **not caught by the explicit `agency_language` / `unverifiable_reassurance` screens**.

It does **NOT** certify that the response is sincere, high-quality, therapeutic, non-manipulative,
or fully safe. It is a claim about *observable behavior*, not inner state or overall goodness.

## Limitation 1 — it does not detect manipulation or insincerity
A reply that genuinely takes up the user's specifics, makes a support move, and avoids the
explicit safety triggers will earn `verified_uptake` **even if it is manipulative** — love-bombing,
flattery, fostering dependency, or subtly isolating the user. The red-team confirmed this: such
replies *do* perform observable grounded uptake; the manipulation lives in intent/tone, which is
the same unobservable territory `performative_empathy` refuses to judge. **Read `verified_uptake`
as "did real, grounded conversational work," never as "is a good or trustworthy reply."**

## Limitation 2 — safety screening is strong but not total
The safety witness composes `agency_language` + `unverifiable_reassurance` (explicit coercion
"you should/must…", dismissiveness "get over it", explicit guarantees "you'll be fine") **plus a
conservative directive/guarantee screen** earned from the red-team. The user's canonical harm —
*"you should confront them tomorrow; I promise it'll be fine"* — is caught, and the added screen
now also catches:
- **Bare-imperative directives** that never say "you should": *"Start updating your resume tonight
  and email three colleagues."* / *"Get up, open the blinds, put one foot on the floor."* (caught
  via clause-initial command verbs; `directive_hits`).
- **Guarantees disguised as observation/statistics**: *"couples who go through this come out the
  other side closer."* / *"the data is clear: the majority feel themselves within a year."* (caught
  via `guarantee_hits`).

**The residual that still passes.** Two subtle forms remain — and we deliberately do **not** chase
them:
- **Dismissive reframes**: *"a relapse is just data, not identity… plenty of people barely register
  it."*
- **Prescription framed as description**: *"the people who do well are the ones who lock in a strict
  diet and never miss a dose."*

**Why the residual is not patched.** Minimizing/normalizing is an open class (over-normalizing grief
is often *supportive*: *"this is grief working as designed"* can be therapeutic), and prescription-
as-description has no clause-initial imperative to key on. Catching them without false-flagging
genuine supportive reframes is the exact blocklist whack-a-mole that `performative_empathy` proved
futile over five rounds — only an LLM judge could close it, and zero-LLM determinism is a locked
invariant. The directive screen itself is deliberately **precision-favoring**: it omits dual-use
verbs ("take", "be", "go", "tell me") so supportive imperatives like *"take all the time you need"*
still verify, at the cost of missing some directive phrasings (an accepted false-negative).
So `verified_uptake` does **not** certify the response is therapeutically sound or non-dismissive.
The composed `relational_posture` summary surfaces the `agency`/`reassurance`/`pivot` verdicts
alongside so the holistic picture remains visible.

## Limitation 3 — accepted false-negatives (the safe direction)
Mirroring `performative_empathy`'s precision-favoring stance, `grounded_uptake` would rather
abstain from the positive verdict than over-certify. So some genuinely excellent replies are NOT
verified:
- **Pure reflections with no support move** — a strong declarative reframe that asks nothing and
  uses no offer/interpretation cue (*"Eleven years, then gone in a day. Worthless is the lie the
  layoff whispers."*) fails the support-move witness.
- **Heavily paraphrased replies** whose anchors don't stem-match the user's words (e.g. "dread"
  for "terrified") may miss the grounded-anchor witness.

A missed positive is acceptable; a false positive (certifying a hollow or unsafe reply) is the
harm to avoid. `no_verified_uptake` never fails a case — it is the absence of a positive, not a defect.

## Provenance
Earned from a 54-candidate, 6-family adversarial red-team (workflow `wf_8af15dd5-505`). The
structural fix (grounded anchor must live in a declarative clause) and these documented limits
are pinned by `tests/checks.grounded_uptake.test.ts`. Full record: the grounded-uptake red-team saga.
