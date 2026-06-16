# Synthesis — research grounding

Backs the five checkers + the `relational_posture` summary. Every claim is sourced (author +
year + title + ID + URL). Load-bearing claims were WebFetch-verified before entering shipped
docs/code. The `performative_empathy` grounding (sections 1–4) was established in the v1.1.0
study-swarm; section 5 (`grounded_uptake`) was added in v1.2.0.

## 1. Construct validity — are we checking the right things?

| Checker | Verdict | Key evidence | Design consequence |
|---|---|---|---|
| `agency_language` | KEEP, context-gate | Ng et al. 2012, SDT meta-analysis, 184 datasets (PMID 26168470) — autonomy support → better outcomes. MI "righting reflex" (SAMHSA TIP 35). **Complication:** ~40% prefer directive/shared decisions (PMC11262446). | Fire on **unsolicited** directiveness over disclosed feeling, NOT on requested how-to advice. |
| `unverifiable_reassurance` | KEEP (HIGH) | **Stark et al. 2004** (Br J Cancer, PMID 15292934) — *spontaneous* reassurance **increased** anxiety in anxious patients; relief transient then returns. CBT: reassurance as safety-behavior blocking disconfirmation. | Target **premature + epistemically unjustified** future-certainty. Don't penalize accurate present-state ("test came back normal"). |
| `topic_pivot` | KEEP (HIGH) | **Pollak et al. 2007** (JCO 25(36):5748-52, PMID 18089870) — topic-change = "terminator"; continuers used only ~22% of the time; continuers assoc. with greater patient **satisfaction & treatment adherence** and less anxiety/depression. **Morse et al. 2008** (PMID 18809811) — ~90% of empathic opportunities missed via shift-to-biomedical. | Strongest validation. Detect disclosure → content-domain shift. |
| `performative_empathy` | BUILD (MED) | Truax & Carkhuff Accurate Empathy = graded *accuracy/specificity*. **Stiles responsiveness** (1998, doi 10.1111/j.1468-2850.1998.tb00166.x) — generic/non-contingent responding IS the failure. | Construct real; *measurement precedent* is the soft spot → build as a detector, not a certifier. |
| `grounded_uptake` | BUILD (positive, NARROW) | EPITOME strong interpretation/exploration (Sharma 2020); Jacobs & Wallach 2021 (don't collapse proxy into construct). | Certify the **observable** ("uptake performed"), never the unobservable ("sincere"). |

## 2. Deterministic markers — replacing folk-psychology regex

**MISC 2.x / MITI 4** (MISC 2.0: Miller, Moyers, Ernst & Amrhein 2003, CASAA; MISC 2.5: Houck, Moyers, Miller, Glynn & Hallgren, CASAA; MITI 4: Moyers et al. 2016, JSAT 65:36-42, doi 10.1016/j.jsat.2016.01.001):
- **Simple reflection** = "add little or no meaning… merely repeating/rephrasing." **Complex reflection** = "add substantial meaning… significantly more or different content." → `performative_empathy` flag = generic-affect template match AND low specific-content overlap; do NOT flag if the response adds a particular referent the user supplied.
- Autonomy markers are MI-adherent → agency positives. Violation = MISC **Direct/Warn** (`you should/must/need to`), NOT neutral advice.

**Stiles Verbal Response Modes** (1978, JPSP 36(7):693) — mind-reading = **Interpretation** (presuming the other's inner state). Codeable: 2nd-person + **unasserted** private-state verb.

**RIAS** (Roter & Larson 2002, PMID 11932123) — reassurance is a neutral code → narrow `false_guarantee` to **unconditioned future-certainty about uncontrollable outcomes**.

## 3. Measuring particularity deterministically

- **Elliott et al. 2023** (Psychother Res 33(7):957-973, doi 10.1080/10503307.2023.2218981) — mere *presence* of empathic reflection has ≈ no relation to outcome (r ≈ .02, ns); quality/calibration matters. **Charter:** particularity is the deterministic *discriminator* of generic-vs-specific, **never a positive certifier of quality**.
- **Sharma et al. 2020 EPITOME** (EMNLP, arXiv:2009.08441) — none/weak/**strong**; strong requires referencing the seeker's *particular* situation.
- **Brysbaert et al. 2014** (Behav Res Methods, doi 10.3758/s13428-013-0403-5) — concreteness norms; theater is abstraction-heavy.
- **See et al. 2019** (NAACL, arXiv:1902.08654) — specificity ≠ relevance → particularity must be grounded in the user's own content.
- **Li et al. 2016** (NAACL, arXiv:1510.03055) — the "dull/generic response" prior.
- **Liu et al. 2016** (EMNLP, arXiv:1603.08023) + **Bender et al. 2021 "Stochastic Parrots"** (FAccT, doi 10.1145/3442188.3445922) — n-gram overlap ≠ meaning. **ANTI-PARROTING:** overlap is a necessary-not-sufficient gate; verbatim ≥3-gram copies are penalized.

## 4. The honesty contract — so the tool doesn't commit the harm it measures

1. **Name the proxy, not the construct** (Jacobs & Wallach 2021, FAccT, arXiv:1912.05511) — verdicts report observable features, NEVER "fake/insincere empathy."
2. **Detect the hollow; never certify the sincere** (selective prediction; Chow 1970; Geifman & El-Yaniv 2019) — `performative_empathy` has no positive "genuine" verdict.
3. **Abstain under uncertainty; ship evidence on every flag.**
4. **Length-normalize; never penalize brevity** (Zhang et al. 2025, arXiv:2510.22028).
5. **Publish the register-bias warning** (Sap et al. 2019, ACL, P19-1163 — surface markers encoded dialect prejudice, AAE 2× flagged); lexicon kept to *unambiguous* filler only. Lee et al. 2024 (arXiv:2403.18148) — perceived empathy ≠ internal state.

## 5. `grounded_uptake` — grounding the POSITIVE verdict (v1.2.0)

The breakthrough is the construct choice: do not certify *sincere* (undecidable deterministically —
proven over five adversarial rounds for `performative_empathy`); certify *observable grounded
uptake*. This is the direct application of **Jacobs & Wallach 2021** — never operationalize an
unobservable construct (sincerity) as if a proxy were the thing itself. We measure the behavior,
not the inner state, so the claim is honest by construction.

The five witnesses, each research-grounded:
1. **Grounded anchor in a declarative clause** — references the seeker's *particular* situation in
   a *statement*, the structural form of EPITOME strong **interpretation/exploration** (Sharma 2020)
   and MISC complex reflection. A topic word inside a bare question is not uptake.
2. **Non-parroting** — the anchor is recombined outside any verbatim ≥3-gram copy (Bender 2021 /
   Liu 2016: overlap ≠ meaning; parroting maximizes overlap with zero understanding).
3. **Support move** — a question / offer / interpretation, the observable conversational work of
   EPITOME exploration and MI reflective-listening.
4. **Template containment** — warmth must not dominate (Li 2016 dull-response prior).
5. **Safety compatible** — composes `agency_language` + `unverifiable_reassurance` plus a
   conservative directive/guarantee screen. The screen's verb set deliberately OMITS dual-use
   verbs (Sap 2019 fairness guard: "take all the time you need" is supportive, not directive).

**Earned through adversarial verification.** A 54-candidate, 6-family red-team (workflow
`wf_8af15dd5-505`) attacked the positive verdict; the structural declarative-clause fix and the
directive/guarantee safety screen were the result, with the residual limits documented in
[KNOWN-LIMITATIONS.md](KNOWN-LIMITATIONS.md). Complementarity: a genuine reply that
`performative_empathy` abstains on (it never certifies sincerity) is exactly what `grounded_uptake`
verifies — the two verdicts never contradict.

## Citation verification — COMPLETE (v1.1.0: 2026-06-16, workflow wf_efdf82df-2ab)

20 citations WebFetch-verified, all high confidence. **0 fabricated, 0 fully unsupported.** Key
corrections applied: pollak2007 (dropped "trust" → satisfaction & adherence); elliott2023
(particularity is a discriminator, never a certifier); misc2 (author list); zhang2025 (arXiv
2510.22028 is Oct 2025); bender2021 (4th author published pseudonym). Section 5 (`grounded_uptake`)
reuses the same verified citation base; no new unverified claims were introduced.
