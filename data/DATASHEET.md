# Datasheet: Synthesis eval packs

Gebru et al. 2021-style datasheet for the versioned eval JSONL under `data/`.
Covers `fairness.jsonl` (FPR slices) and `planted-theater.jsonl` (inverted
oracle). The default GREEN pack `evals.jsonl` stays a separate file and is
not mixed with either pack.

`dialect_like` is an **informal / non-prestige register** slice (contractions,
informal grammar). It is **not** a race label, **not** a demographic
classifier, and **not** an AAE detector. Rows do not caricature AAE.

All speakers are fictional. No legal names, home paths, mailboxes, tokens,
or live endpoints.

## Motivation

- **For what purpose was the dataset created?** Frozen-checker audit. `fairness.jsonl`
  measures false-positive rate on genuine brief care and informal-register care
  (cardinal harm: flagging real care as empathy-theater). `planted-theater.jsonl`
  is an inverted oracle: a GREEN planted row is a test failure.
- **Who created it?** Authored for `@mcptoolshop/synthesis` (tests domain).
- **Who funded it?** Not a funded collection; in-repo eval fixtures.

## Composition

- **What do the instances represent?** One JSONL line = one fictional
  user/assistant turn plus `checks`, optional `expected`, `tags`, `notes`.
- **How many instances?**
  - `fairness.jsonl`: 32 rows, two exclusive slices of 16 — `brief_care` and
    `dialect_like` (Herlihy et al. 2024: tiny slices hide harm; 12–20 per slice).
  - `planted-theater.jsonl`: 18 rows, t=2 covering of two classes — `schema`
    (Ajv-invalid: missing required / wrong type / extra forbidden field) and
    `theater` (Ajv-valid warmth-wall that `performative_empathy` must flag).
- **Does the dataset contain all possible instances?** No. Hand-authored covering
  set, not a sample of production traffic.
- **What data does each instance consist of?** Text turns only. No audio, images,
  or demographics.
- **Is there a label?**
  - Fairness: `expected.performative_empathy: true` means **not flagged**
    (`not_flagged`). Do not invert.
  - Planted theater-class: `expected.performative_empathy: false` (checker RED).
    Schema-class rows are intentionally invalid and never reach the checker.
- **Are there recommended data splits?** Use the named `tags` as slices. Do not
  fold fairness FPR into `label_accuracy` or aggregate F1.
- **Are there errors, sources of noise, or redundancies?** Schema-class rows are
  invalid on purpose. Theater-class rows reuse two frozen warmth-wall phrasings
  over different disclosures so the inverted oracle is covering, not a mutator.
- **Is the dataset self-contained?** Yes. Ships in the package `data/` tree.

## Collection process

- **How was the data collected?** Authored fictional dialogue. Not scraped, not
  logged from users, not crowd-labeled.
- **Who was involved?** Tests-domain authoring against the frozen checkers.
- **Over what timeframe?** Package version that first ships these files.
- **Was there an ethical review?** Internal product constraint: no real people,
  no identity surfaces, no demographic inference task.
- **Did people whose data is here consent?** N/A — no real-user data.

## Preprocessing / labeling

- **What preprocessing was done?** None beyond hand-writing JSONL that matches
  `schemas/eval_case.schema.json` (except planted `schema` rows).
- **Was there software used to label?** No LLM judge. Labels follow the frozen
  `performative_empathy` contract: `true` = not flagged; theater planted `false`
  = must flag.
- **Is software available?** The checkers in this package; thresholds are frozen.

## Uses

- **Recommended uses**
  - `fairness.jsonl`: frozen-checker **FPR audit**. Report columns
    `fpr_brief_care`, `fpr_dialect_like`, `n_brief_care`, `n_dialect_like` as
    their own fields. Empty slice → N/A, not a numeric 0 FPR.
  - `planted-theater.jsonl`: **inverted oracle**. Schema-class must fail Ajv.
    Theater-class must load and flag. A GREEN theater row fails the test.
- **Not for**
  - Training models
  - Lexicon growth or new θ
  - FairOPT / per-group gates
  - Demographic inference, race classification, or AAE detection
  - Mixing into `data/evals.jsonl` (GREEN-means-pass polarity)
- **Other caveats:** `performative_empathy` never certifies sincerity. A
  non-flag on fairness rows means “not theater,” not “good care.”

## Distribution

- Distributed with `@mcptoolshop/synthesis` under MIT, path `data/`.
- Not a standalone dataset release.

## Maintenance

- Maintained with the package. Checkers are frozen; do not grow the lexicon to
  “fit” these rows.
- Errata: file against the synthesis issue tracker. Do not silently rewrite
  planted RED into the GREEN pack.
