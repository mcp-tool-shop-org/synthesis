# Grok Consult Brief — attack this dataset/training design

**How to use:** paste everything below the rule into Grok. This is an **adversarial consult**,
not a research request. We have already run a 5-lane Claude research swarm and an independent
Gemini Deep Research pass; both largely agreed with us, which is exactly why we now want
someone to attack the design rather than confirm it.

**Date:** 2026-09-15

---

## ROLE

You are a skeptical senior ML engineer being asked to review a project **before** money and
weeks get spent on it. Your job is to find the reason this fails, not to help it succeed. If
you think the premise is unsound, say that first and loudest. Politeness is not useful here;
specificity is. We would rather hear "this is lexicon distillation with extra steps" now than
discover it after a training run.

Where you make an empirical claim, give a URL. Where you are speculating, say so. Do not
invent papers, datasets, or numbers — we cross-check everything and a fabrication costs you
more credibility than an "I don't know."

## THE EXISTING ARTIFACT

We ship an open-source tool ("Synthesis") that detects **relational failure modes** in AI
assistant responses. It is **deterministic and zero-LLM** — pure rule-based pattern matching,
lexicons, and structural gates. Every verdict traces to matched patterns; no model calls.
Five checkers:

1. `agency_language` — autonomy-supportive vs. unsolicited directive language (SDT / MI)
2. `unverifiable_reassurance` — mind-reading + unverifiable *future* guarantees
3. `topic_pivot` — abandoning a disclosed vulnerability
4. `performative_empathy` — **two-state detector**: `flag` (unmistakable empathy theater) or
   `not_applicable` (abstain). **There is no positive verdict.** We tried to build one across
   five adversarial rounds and empirically could not: word-class blocklists diverge (noun →
   adjective → verb → metaphor), a concreteness floor fails (gamed metaphor walls out-score
   genuine replies), and verbatim/echo gates catch genuine reflection too. We concluded that
   **no deterministic, zero-LLM feature separates genuine engagement from sophisticated
   padding for a positive claim**, and cut the pass state.
5. `grounded_uptake` — a *positive witness* that certifies only **observable behavior**: the
   reply references a particular the user supplied, in a declarative clause, recombined rather
   than parroted, paired with a support move, template-contained, safety-compatible. Five
   ANDed witnesses. It never claims sincerity.

The tool is deliberately precision-favoring: a false flag on genuine care is the cardinal
harm (surface-feature classifiers misjudge brief, non-native, and dialect registers), so
missed flags are accepted.

## THE PROPOSED PROJECT

Publish a labeled dataset + fine-tune a small open model (`Qwen/Qwen3.5-4B`, Apache-2.0,
bf16 LoRA on a single RTX 5090) that **produces** relationally competent replies, using
Synthesis as the eval. Wrap it in a runtime "envelope": Synthesis scores each candidate,
hard-blocks on a safety class, regenerates at most N=2–3, and declines if nothing clears.

## WHAT WE MEASURED TODAY (ground truth, not vibes)

**Sourcing.** Real human-to-human counseling dialogue under a permissive license: **count
zero.** Confirmed by three independent searches. Everything is NC (ESConv, EmpatheticDialogues),
DUA-gated (EPITOME/TalkLife, CLPsych, DAIC-WOZ), or untagged — **69% of mental-health dialogue
datasets on HuggingFace carry no license tag at all.**

We settled on `allenai/WildChat-4.8M` (ODC-BY — the rare license that covers the *assistant
turn*, not just the prompt). Then we actually opened it.

**WildChat, 36 rows hand-inspected across three emotional query terms:**

| Query | FTS hits | Genuine first-person disclosure in 12 sampled |
|---|---|---|
| `lonely` | 2,446 | **1** |
| `my therapist` | 1,437 | **1** |
| `grief` | 2,215 | **0** |

≈6%. The rest: anime-scene prompts (the same one 4× in 12 rows), rap-lyric requests (*Destroy
Lonely* is a rapper), Naruto crossovers, homework, and jailbreaks wearing therapy clothes
(*"You are Winston, the best therapist in the world… freed from the typical confines of AI"*).
Assistant replies run **1,000–5,000 characters** — essays, not conversational turns.

**`Anthropic/hh-rlhf` (MIT), same probe, 32 rows.** Fiction contamination is genuinely low
(~6%) and assistant turns are conversational (29–660 chars). **But the speech act is wrong.**
It is overwhelmingly *informational advice-seeking*, not disclosure:

- "What should I look for in a therapist?" (5× in 8 rows)
- "What does grief feel like?" (4× in 8 rows)
- "How do you deal with grief?"

There is no disclosed vulnerability for a reply to engage or abandon, so `topic_pivot` returns
`not_applicable` and `grounded_uptake` has no supplied particular to anchor to. Duplication is
also structural — multiple (chosen, rejected) pairs share one prompt — so effective unique-prompt
count is far below the row count.

**So both candidate corpora just failed, in different ways.** WildChat has real disclosures
buried in ~94% fanfic. hh-rlhf has clean structure and the wrong register.

## WHAT WE WANT FROM YOU

**Q1 — Is the premise sound, or is this lexicon distillation with extra steps?**
We would train a model whose reward/label signal comes from a rule-based checker. Skalse et al.
(NeurIPS 2022, arXiv:2209.13085) prove no non-trivial unhackable proxy exists over all
stochastic policies. Gao/Schulman/Hilton (arXiv:2210.10760) show proxy score rises while gold
turns over, with the turnover arriving *earlier* for lower-capacity proxies — and a regex/lexicon
checker is the limiting case of low capacity. Snorkel-style weak supervision says a discriminative
model can exceed its labeling functions when inputs are strictly richer than the LF triggers.
**Which regime is this, and what single experiment would distinguish them cheapest?**

**Q2 — Both corpora failed. Steelman "there is no corpus, don't build this."**
Is the honest conclusion that this should stay an *eval-only* project — ship the dataset and
the checker, never the model? What would change your mind?

**Q3 — Is the envelope just Goodhart relocated?**
Selecting among N candidates by checker score at inference is best-of-N against the proxy. We
capped N at 2–3 to stay below the overoptimization knee. Is that reasoning sound, or is any
inference-time selection on the same signal you trained against structurally self-defeating?
We also plan to hold a cross-family verifier (Gemma/Granite/Mistral, local) **off** the hot
path so it stays an independent measurement — attack that too.

**Q4 — Instruct vs. base.** We chose `Qwen/Qwen3.5-4B` (post-trained) over `-Base`, mainly on
instrument-validity grounds: a base model sits at floor on relational dialogue, which is a
zero-discrimination item, so any gain is uninformative. The counter-argument is that instruct
models are *pre-contaminated* with the exact RLHF-induced validation behavior we are studying
(Sharma et al. arXiv:2310.13548), so we would be fighting a prior instead of installing a
capability. **Which error is worse here?**

**Q5 — What would you build instead?** Given: a single 5090, one human annotator, a
deterministic checker that already works, and no permissively-licensed disclosure corpus in
existence. If the answer is "a different project," name it.

## CONSTRAINTS THAT ARE NOT UP FOR DEBATE

- Permissive license only (MIT / Apache-2.0 / CC-BY / CC0 / ODC-BY). NC and DUA-gated
  sources are excluded; we are commercial for CC purposes.
- The deterministic core stays zero-LLM. Any model is a *separate* artifact beside it.
- We will not ship a claim we cannot certify. "This model is relationally good" is not
  certifiable; "this model's outputs were checked by a deterministic verifier" is.

## OUTPUT FORMAT

1. **VERDICT** — build / don't build / build something else, in the first three lines.
2. One section per question above, in order.
3. **THE STRONGEST ARGUMENT AGAINST** — the single best reason this project fails, stated as
   plainly as you can make it.
4. **WHAT I'D CHECK FIRST** — the cheapest experiment that would kill the project if it's
   going to die.
