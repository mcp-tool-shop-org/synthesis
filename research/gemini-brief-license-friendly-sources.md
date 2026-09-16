# Gemini Deep Research Brief — permissively-licensed dialogue sources for a relational-failure dataset

**How to use:** paste everything below the line into Gemini (Deep Research mode preferred).
It is written to be self-contained — Gemini needs no prior context from this repo.

**Why this exists:** a five-lane Claude swarm is answering the same question in parallel.
This brief is deliberately an *independent* replication, not a copy. Where the two agree we
have cross-family corroboration; where they disagree we have found a fabrication or a stale
fact in one of them. Do not merge the answers before comparing them.

**Date written:** 2026-09-15

---

## ROLE

You are a research analyst producing a sourcing report for a small software studio. The studio
is building a **public, permissively-licensed dataset** and needs to know what source material
it can legally use. Accuracy about licenses matters more than breadth. A confidently wrong
license claim is the single worst outcome of this task — worse than returning very few results.

## PART 1 — WHAT THE DATASET IS

The studio ships an open-source tool that detects **relational failure modes** in AI assistant
responses — the ways a reply can be fluent, warm, and still fail the person it is answering.
They want to publish a labeled dataset of these phenomena on HuggingFace under a permissive
license (MIT or CC-BY), so the tool's claims can be independently checked.

The unit of annotation is a **pair**: one human turn in which a person discloses something
difficult, and one response to it. The response may be authored by a human or by an AI
assistant — both are in scope, and it is useful to know which.

The five constructs being labeled:

1. **Empathy theater / hollow warmth** — a response that is entirely emotional register with no
   engagement: high template density, no reference to anything the person actually said.
2. **Unsolicited directive language** — telling someone what to do without being asked.
   Operationally very close to the "advise without permission" and "confront" codes in
   Motivational Interviewing fidelity schemes (MITI/MISC).
3. **Unverifiable reassurance** — claims about the future or about another person's inner state
   that the speaker cannot know ("it'll be fine", "they didn't mean it"). The clinical
   literature calls the nearby concept "premature reassurance."
4. **Topic pivot away from disclosed vulnerability** — someone discloses something hard and the
   response moves to a different subject.
5. **Grounded uptake** (the positive construct) — observable evidence that the response engaged
   *this specific person's* situation: it references a particular they supplied, recombined
   rather than parroted, and pairs it with a question, offer, or interpretation.

Note that all five are specified as **observable behaviors**, never as inner states. The studio
deliberately does not attempt to label sincerity. Sources that label "empathy level" on a rubric
are of limited use; sources that label *what the responder did* are valuable.

## PART 2 — WHAT WE ALREADY KNOW (do not spend effort re-finding these)

Verified as of 2026-09-15 against the HuggingFace API and arXiv:

| Source | Status | License |
|---|---|---|
| ESConv (`thu-coai/esconv`) | known, 1,641 downloads/30d | **cc-by-nc-4.0 — NC, unusable for permissive redistribution** |
| EmpatheticDialogues (`facebook/empathetic_dialogues`) | known, 2,258 dl/30d | **cc-by-nc-4.0 — NC** |
| EPITOME (arXiv:2009.08441) | known, not on HuggingFace | TalkLife data use agreement — gated |
| PsyQA (arXiv:2106.01702) | known | research-use agreement |
| AnnoMI (`to-be/annomi-...`) | known, 133 conversations | openrail |
| `meg-tong/sycophancy-eval` | known | MIT |
| `EleutherAI/sycophancy` | known, 4,355 dl/30d | **no license tag at all** |
| HEART (arXiv:2601.19922) | known, Jan 2026 | benchmark paper |
| Incongruent Positivity (arXiv:2509.10184) | known | paper |
| ELEPHANT (arXiv:2505.13995) | known | paper |
| TIAGE (arXiv:2109.04562) | known | paper |

Three gaps we believe are real, and would like you to **independently confirm or refute**:

- No public benchmark labels warmth as *hollow*, templated, or "safe but empty."
- No NLP corpus operationalizes autonomy-supportive vs. controlling language (the
  Self-Determination Theory construct); it appears to be hand-coded in psychology only.
- No dataset labels unverifiable reassurance / false comfort, despite the construct being
  well established in clinical communication research.

If any of these three is wrong — if such a dataset exists — that is the **single most valuable
finding you can return.** Say so loudly and give the URL.

## PART 3 — WHAT WE NEED YOU TO FIND

**Acceptable licenses:** MIT, Apache-2.0, CC0, CC-BY (any version), public domain, ODC-BY, or
similarly permissive. **Disqualifying for redistribution:** CC-BY-NC, any NC or ND variant,
research-only data use agreements, and — importantly — **no license tag at all**. An untagged
dataset is legally unusable for redistribution, not "probably fine."

Answer these, in order of value to us:

**Q1. Permissively-licensed dialogue corpora containing disclosure→response structure.**
Human-to-human or human-to-AI. Prioritize anything with a turn structure where one party shares
difficulty and another responds. For each: name, URL, size, exact license string, and whether
responses are human- or model-authored.

**Q2. Non-English and regional sources.** Our prior search was English-centric and likely
missed a great deal. Check European, Chinese, Japanese, Korean, and Indian research corpora;
national research-data archives; EU-funded project deliverables (which often carry CC-BY by
funding mandate); and university institutional repositories. Funding-mandated open licenses are
a promising and under-searched vein.

**Q3. Institutional and grey-literature sources.** Dataverse instances, CLARIN, the European
Language Resources Association, LDC (note cost and terms), national libraries, and any
government-funded corpus release. US federal government works are public domain by statute
(17 U.S.C. §105) — is there anything usable there?

**Q4. The annotations-only question.** Is there established precedent for publishing an
annotation layer (document IDs + character offsets + labels, no source text) under a permissive
license, over source text that is NC-licensed or access-restricted? Name real datasets that do
this and describe exactly how they package it. Then state whether Creative Commons' own
guidance treats such a layer as "Adapted Material" under an NC license. Quote the clause.

**Q5. 2025–2026 releases specifically.** Our knowledge of the last eighteen months is weakest.
What has appeared recently in this space — new benchmarks, new corpora, new shared tasks
(CLPsych, WASSA, AffectiveNLP, SemEval) — and under what terms?

## PART 4 — OUTPUT FORMAT

1. A table of every candidate source: **name · URL · size · exact license string · human or
   model authored · disclosure→response structure yes/no · verified how**.
2. A section **"CLEANEST FIVE"** — the five best genuinely-permissive options, ranked, each
   with one sentence on why it ranks there.
3. A section **"CONFIRMED GAPS"** — your independent verdict on the three claimed gaps in
   Part 2, each marked CONFIRMED, REFUTED (with the URL that refutes it), or UNCERTAIN.
4. A section **"ANNOTATIONS-ONLY VERDICT"** — a direct answer to Q4 in three lines or fewer,
   then the precedent.
5. A section **"WHAT I COULD NOT VERIFY"** — everything you suspected but could not confirm.
   This section is mandatory and an empty one will be read as a failure to look honestly.

## PART 5 — VERIFICATION STANDARD (read this twice)

- **Give a URL for every factual claim.** A license assertion without a link to the license
  file, dataset card, or terms page is not usable to us.
- **Never infer a license from a dataset's popularity, its host, or the permissiveness of
  similar datasets.** Read the actual tag or terms page.
- **If you cannot verify something, write "COULD NOT VERIFY" and move on.** We would far
  rather receive eight verified sources than thirty with four invented ones. We will be
  cross-checking your answer against an independent search, so a fabrication will be caught
  and will cost more than an omission.
- **Do not invent dataset names, arXiv IDs, DOIs, or license clause names.** If you recall a
  dataset but cannot find it, list it under "could not verify" with what you remember.
- **Distinguish the license of the *paper* from the license of the *data*.** These differ
  constantly — a CC-BY paper very often describes a restricted corpus.
- Report negative results. "I searched CLARIN for X and found nothing usable" is a finding we
  want, not padding to be avoided.

## PART 6 — WHAT A GOOD ANSWER LOOKS LIKE

A good answer might be short. If the honest finding is that almost nothing in supportive-dialogue
research is permissively licensed, that conclusion — stated plainly, with the evidence of having
looked in the right places — is more valuable to us than a long list padded with NC corpora and
untagged uploads. We are making a build-or-license decision, and a clear negative lets us make
it immediately.
