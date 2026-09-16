# Sourcing Decision Record — Synthesis relational-failure dataset

**Date:** 2026-09-15
**Status:** sourcing resolved; corpus not yet built
**Method:** 5-lane Claude research swarm + independent Gemini Deep Research replication,
all license claims re-verified by direct HuggingFace API call or license-file fetch.

---

## 1. The decision

**Base corpus: `allenai/WildChat-4.8M` (ODC-BY, ungated, 3.2M conversations).**

It is the only source found that clears all four bars simultaneously:

| Bar | Why it matters | WildChat |
|---|---|---|
| Real human disclosure | We annotate responses to genuine vulnerability, not role-play | ✅ organic users |
| Real assistant turns | The annotated unit is a model's reply | ✅ gpt-4o / gpt-4 / o1 / gpt-4.1-mini |
| License covers the **assistant turn** | Most chat corpora license prompts only | ✅ ODC-BY covers both, uniformly |
| Ungated bulk access | Gated sets stall the build | ✅ not gated |

Every alternative fails at least one bar. See §4.

## 2. Supporting sources (all verified)

| Source | License | Role |
|---|---|---|
| `allenai/WildChat-1M` | `odc-by` ✅ | Pilot / annotator-calibration set. Better studied (arXiv:2405.01470) |
| `Anthropic/hh-rlhf` | `mit` ✅ | Supplement. **Retains** self-harm content WildChat's filter excises. Crowdworkers, not organic users — supplement only |
| `microsoft/WildFeedback` | `odc-by` ✅ | **External weak label** — see §3 |
| `AI-companionship/INTIMA` | `cc-by-4.0` ✅ | Schema donor: 31-code reinforce/resist/neutral taxonomy on emotionally charged input |
| `UKPLab/Graph2Counsel` | `cc-by-sa-4.0` ✅ | Optional extension. **ShareAlike is viral** — keep out of an MIT core or accept SA |
| `ShenLab/MentalChat16K` | `mit` ✅ | Optional. Caveat: Mistral-7B paraphrased, single-turn, card self-contradictory |
| PriMock57 | `CC-BY-4.0` ✅ (LICENSE.md read) | Optional. Genuine human↔human but medical register, 57 sessions |

## 3. The methodological unlock — WildFeedback

`microsoft/WildFeedback` is WildChat-derived and carries **in-situ user satisfaction /
dissatisfaction signals** — naturally occurring evidence that a reply did not land,
produced by the actual user, in the moment, with no involvement from us or our checker.

This is the answer to the circularity problem that otherwise sinks this project. The risk
was always: label real text with Synthesis → train a model on those labels → evaluate with
Synthesis. Three layers of one opinion.

DSAT gives an **independent** correlate. If Synthesis's flags track real user
dissatisfaction, that is external validation from a signal with no relationship to our
lexicon. If they do not track it, that is a finding about Synthesis worth more than the
model would have been.

**This should be measured before any training run.** It is free and it is decisive.

## 4. Excluded, and why

| Excluded | Reason |
|---|---|
| ESConv, EmpatheticDialogues | `cc-by-nc-4.0`. ED's **LICENSE file** says NonCommercial — the ParlAI README claiming CC-BY-4.0 is wrong |
| `yenopoya/TIDE`, KokoroChat, MI-Dataset | NC (KokoroChat is also ND — blocks derivatives outright) |
| `HannahRoseKirk/prism-alignment` | Human text CC-BY-4.0 but **model responses CC-BY-NC-4.0** — our unit is the NC half |
| `lmarena-ai/arena-human-preference-*` | Tagged `cc-by-4.0`, but README: *"model outputs are governed by the terms of use set by the respective model providers."* **The tag is misleading** |
| `lmsys/lmsys-chat-1m` | Custom agreement: *"You should not distribute, copy… or otherwise transfer the dataset to any third party"* |
| EPITOME / TalkLife, CLPsych, DAIC-WOZ, Crisis Text Line | **Contractual DUAs, not copyright.** Standoff annotation is a copyright defense and does not reach a contract |
| `OpenAssistant/oasst1` / `oasst2` | Apache-2.0 and otherwise fine, but **assistant turns are human volunteers role-playing** — wrong unit. Annotating these as assistant behavior would silently corrupt the corpus |
| `nbertagnolli/counsel-chat` | **Untagged on HF** (`cardData.license: None`). The MIT is on the GitHub *scraper repo* and was asserted by the scraper, not the therapists who wrote the answers — chain of title broken |
| `Amod/mental_health_counseling_conversations` and derivatives | `license:other`. Several MIT/Apache re-uploads derive from it — **license laundering**. A permissive tag on a derivative of an untagged source is worthless |
| All Reddit-derived corpora | Posters retain copyright; no researcher has chain of title. Reddit for Researchers is NC-only and forbids redistribution |

## 5. Field-shape findings (worth keeping)

- **69% of mental-health dialogue datasets on HuggingFace carry no license tag at all**
  (546 of ~788 core-topic, 30-term sweep). Untagged is *unusable*, not "probably fine."
- **Permissive + human-authored + multi-turn is essentially a null set at scale.** Three
  independent searches (Gemini, lane 2, lane 5) converged on this. Real verbatim
  human-to-human counseling under a permissive license: count zero.
- WildChat sidesteps that null set entirely, because we do not need human *responses* —
  we need human *disclosures* and model *responses*, which is exactly its shape.
- Zenodo, OSF, and Harvard Dataverse returned near-total negatives for dialogue corpora.
- **No public-domain source is register-appropriate.** Every PD corpus (advice columns,
  letters, hearings) is 60–130 years old and would teach Edwardian cadence.

## 6. Confirmed gaps (independently corroborated)

Both the Claude swarm and Gemini confirmed, from different indexes:

1. No public benchmark labels warmth as **hollow / templated / safe-but-empty**.
2. No NLP corpus operationalizes **autonomy-supportive vs. controlling** language (SDT).
3. No dataset labels **unverifiable reassurance / false comfort**.

Nearest prior art is HEART (arXiv:2601.19922), whose headline finding — *LLMs mirror the
form of empathy more faithfully than its function* — is this project's thesis, named as a
result and scored on a rubric, never turned into an annotatable class.

## 7. Release structure

- **Core (MIT or CC-BY-4.0):** full text, drawn only from ODC-BY / MIT sources.
  ODC-BY requires attribution; it does not restrict commercial use.
- **Extension layer (optional, for restricted sources):** `{corpus_id, doc_id, turn_id,
  char_start, char_end, label, span_sha256}` — **no plaintext spans.** Hashing proves the
  annotation without reproducing restricted text, avoiding both the copyright
  substantiality test and EU Database Directive Art. 7(5) reconstitution.
  Precedent: CoNLL-2003, UD_English-ESL (CC-BY-SA on the annotation layer alone),
  OSCAR-2201 split-licensing.
- **Separate `LICENSE-ANNOTATIONS` from `LICENSE-DATA-NOTICE`.** Do not attach an NC
  license to our own annotations as a workaround — it poisons downstream reuse and does
  not cure the upstream term.
- Assume we are **commercial** under CC NC §1(i): a dataset released to support a
  commercial studio tool is "directed towards commercial advantage."

## 8. Ethics constraints carried forward

- AoIR IRE 3.0: *"the greater the vulnerability of our subjects, the greater our
  responsibility and obligation to protect them from likely harms."*
- Quoted social-media posts were traced back to the author **84%** of the time
  (npj Digital Medicine). Consent to a researcher is not consent to redistribution
  (Nissenbaum, contextual integrity).
- WildChat is already public, already ODC-BY, and AI2 performed the anonymization — an
  annotation layer over it is a materially different act from publishing new disclosure.
  The datasheet must still say so explicitly rather than rely on the license alone.
- Where seed material is needed, use CC-BY transcripts as **structural** seeds (stressor
  type, relational stance, ask-shape) and generate surface text. Never redistribute
  verbatim disclosure that was collected for a different context.

## 9. Open items before any training run

1. **Sample WildChat for emotional load** and measure the Synthesis base-rate distribution.
   Probe validated: `lonely` 2,446 · `grief` 2,215 · `diagnosed` 990 · `divorce` 682 ·
   `depressed` 477 in the 1M split; control `zzzqqqxyzzz` → 0.
2. **Floor/ceiling gate.** The metrics must land strictly between floor and ceiling on the
   untrained baseline, or re-instrument before spending anything.
3. **DSAT correlation** (§3) — the external-validity check.
4. **~300 blind human labels**, adjudicated without Synthesis's verdict visible.
   LLM pre-annotation raised annotator agreement-with-suggestion from 40% → 81–87% and
   inflated apparent model F1 from 0.47 → 0.79 (arXiv:2507.15821). Do not pre-annotate.
5. Request `WildChat-4.8M-Full` access in parallel (manual approval has latency) only if
   the filtered split proves insufficient — it probably will not.
