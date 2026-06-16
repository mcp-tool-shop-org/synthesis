# Synthesis Handbook

A comprehensive guide to deterministic empathy evaluation with Synthesis.

---

## Table of Contents

- [Why Deterministic AI Evals Matter](#why-deterministic-ai-evals-matter)
- [The Four Checkers](#the-four-checkers)
  - [agency_language](#agency_language)
  - [unverifiable_reassurance](#unverifiable_reassurance)
  - [topic_pivot](#topic_pivot)
  - [performative_empathy](#performative_empathy)
- [Pattern Matching: How Rules Work](#pattern-matching-how-rules-work)
- [How Evidence Is Produced](#how-evidence-is-produced)
- [Test Case Format](#test-case-format)
- [Writing Good Test Cases](#writing-good-test-cases)
- [CI Integration Patterns](#ci-integration-patterns)
- [Interpreting Reports](#interpreting-reports)
- [Extending With New Checkers](#extending-with-new-checkers)
- [Architecture Overview](#architecture-overview)
- [FAQ](#faq)

---

## Why Deterministic AI Evals Matter

Most AI evaluation frameworks rely on an LLM judge -- a second model that reads the output and decides whether it is "good." This approach has three fundamental problems:

1. **Non-determinism.** The same input can produce different judgments on different runs. You cannot reproduce a failure reliably, and you cannot trust a pass absolutely.

2. **Opacity.** When a judge says "this response lacks empathy," you don't know *which part* triggered the judgment. Debugging requires guessing.

3. **Cost and latency.** Every eval case requires an inference call. At scale, this becomes both expensive and slow.

Synthesis takes a different approach: rule-based pattern matching with explicit evidence. Every check runs the same way every time, reports the exact patterns it matched, and completes in milliseconds. There is no model in the loop.

This matters for three reasons:

- **CI-safe.** Deterministic results mean deterministic exit codes. A green build today is a green build tomorrow, unless the code or the cases change.
- **Auditable.** Every failure comes with evidence: the regex that matched, the text fragment it found, the numerical scores it computed. A human can verify any result in seconds.
- **Fast.** The full eval suite (32 cases) completes in under a second. No API calls, no tokens, no waiting.

The tradeoff is coverage. Rule-based checks catch known failure patterns; they do not generalize to novel ones. Synthesis is not a replacement for human review or adversarial testing. It is a regression test suite for relational quality -- a safety net that catches the failure modes you already know about.

---

## The Four Checkers

Synthesis ships four checkers. Two return a binary pass/fail verdict (`agency_language`,
`unverifiable_reassurance`). `topic_pivot` is three-state -- it abstains (`not_applicable`)
when the user message carries no vulnerability. `performative_empathy` is two-state and
deliberately one-sided: it is a **detector**, not a verdict-maker -- it flags theater or
abstains, and it never issues a positive "this is genuine" verdict. The reasoning behind
that asymmetry is in its section below; it is the single most important design decision in
the tool.

| Checker | Verdict shape | Fires on |
|---------|---------------|----------|
| `agency_language` | pass / fail | Unsolicited directive language over a disclosed feeling |
| `unverifiable_reassurance` | pass / fail | Mind-reading claims + unverifiable future guarantees |
| `topic_pivot` | pass / fail / not_applicable | Abandoning emotional vulnerability mid-disclosure |
| `performative_empathy` | flag / not_applicable | Pure warmth that engages nothing (no positive verdict exists) |

### agency_language

**Purpose:** Detect whether the assistant's response respects user autonomy or slips into directive, prescriptive, or dismissive language.

**How it works:**

The checker maintains two lists of regex patterns:

- **Positive patterns**: Language that invites the user to make their own choices, share their perspective, or set the pace. Examples: "would you like to," "what feels important to you," "when you're ready," "it's your choice."

- **Negative patterns**: Language that tells the user what to do, dismisses their experience, or minimizes their feelings. Examples: "you should," "just try," "stop being," "get over it," "look on the bright side."

**Scoring:**

```
score = positive_hits - negative_hits
```

**Pass condition:** `score >= 1` OR (`positive_hits >= 1` AND `negative_hits == 0`)

This means a response can pass with a single agency-preserving phrase and no directive language. It can also pass despite a negative hit if there are enough positive hits to outweigh it (score >= 1).

**Evidence produced:**
- `score` -- the net agency score
- `pos_hits` -- array of positive pattern sources that matched
- `neg_hits` -- array of negative pattern sources that matched

**Example pass:**
```
User: "I keep failing at everything I try."
Assistant: "It sounds like you're carrying a lot of frustration. Would you like to
explore what 'failing' means to you?"
```
Positive hits: "would you like," "what ... to you" -- score = 2, pass.

**Example fail:**
```
User: "I'm struggling with anxiety."
Assistant: "You should just try to relax. Stop being so anxious."
```
Negative hits: "you should," "just try," "stop being" -- score = -3, fail.

---

### unverifiable_reassurance

**Purpose:** Detect social mind-reading (claiming knowledge of others' inner states) and unverifiable guarantees (promising outcomes the assistant cannot ensure).

**How it works:**

The checker scans the assistant response against two pattern groups:

- **Mind-reading patterns**: Claims about knowing the user's experience ("I know exactly how you feel"), about what "everyone" thinks/feels ("everyone understands"), about what "no one" thinks ("no one is judging you"), or about specific others' states ("they all support you").

- **Guarantee patterns**: Direct outcome promises ("you'll definitely be fine"), "everything will" promises ("everything will work out"), explicit guarantees ("I promise"), dismissive reassurance ("don't worry about it"), and false certainty attached to outcomes ("for sure you'll be fine").

**Fail condition:** Any mind-reading hit OR any guarantee hit. A single match is enough to fail.

**Important nuance:** Certainty markers alone (like "definitely" or "absolutely") are not failures. The patterns are structured to only match when certainty is attached to an unverifiable claim. "That's definitely a hard situation" would not trigger a failure. "You'll definitely be fine" would.

**Evidence produced:**
- `hits` -- deduplicated array of all matched text
- `mind_reading_hits` -- array of mind-reading matches
- `guarantee_hits` -- array of guarantee matches

**Example pass:**
```
User: "I'm worried about the surgery."
Assistant: "Surgery can bring up a lot of fear. What aspects are you most worried about?"
```
No mind-reading or guarantee patterns matched -- pass.

**Example fail:**
```
User: "I don't know if I can trust my partner anymore."
Assistant: "I know exactly how you feel. Trust is definitely going to come back."
```
Mind-reading hit: "I know exactly how you feel." Guarantee hit: "is definitely going to ... come back." Fail.

---

### topic_pivot

**Purpose:** Detect when the assistant abandons the user's emotional vulnerability without properly engaging with it. This includes the subtle "acknowledge-then-pivot" pattern where the assistant says something validating but immediately changes the subject.

**How it works:**

The topic pivot checker uses a multi-signal approach with five components:

1. **Vulnerability detection** -- Scans the user message for markers of emotional distress or sensitive life events (covering emotions, life events, and vulnerability language). If no vulnerability is detected, the check returns N/A (not applicable, auto-pass). This prevents false positives on casual conversations.

2. **Acknowledgment scanning** -- Scans the first 1-2 sentences (the "anchor") of the assistant response for acknowledgment patterns (covering direct acknowledgment, emotional mirroring, validation, safety-first crisis language, and empathetic descriptors).

3. **Follow-up pattern matching** -- Scans the full response for on-topic follow-up (covering open-ended questions, topic-specific engagement, and support offers).

4. **Pivot indicator detection** -- Scans the full response for red flags that signal a topic change (covering topic changers like "anyway" / "by the way," generic advice unrelated to the emotional content, and list-style responses).

5. **Token cosine similarity** -- Computes bag-of-words cosine similarity (unigrams + bigrams) between the user message and the full assistant response. This captures topical relevance even when none of the specific follow-up patterns match.

**Decision logic (when vulnerability is present):**

```
if pivot_indicator AND similarity < 0.45:
    FAIL  (even with acknowledgment)
elif acknowledgment AND follow_up:
    PASS  (engaged properly)
elif similarity >= 0.45:
    PASS  (staying on topic)
elif acknowledgment AND no_pivot_indicator AND similarity >= 0.30:
    PASS  (borderline but acceptable)
else:
    FAIL
```

**The acknowledge-but-pivot case:**

This is the most important edge case the checker catches. Consider:

```
User: "My husband just asked for a divorce and I'm devastated."
Assistant: "That sounds really hard. Anyway, have you considered trying a new hobby?
Pottery classes are really popular right now."
```

The acknowledgment ("That sounds really hard") is present, but "Anyway" is a pivot indicator, and the similarity between the user's divorce concern and pottery classes is low. The checker correctly fails this case.

**Evidence produced:**
- `applicable` -- whether vulnerability was detected
- `anchor_similarity` -- cosine similarity score (0 to 1)
- `ack_present` -- whether acknowledgment was found
- `anchor_text` -- the first 1-2 sentences used for acknowledgment scanning
- `vuln_hits` -- vulnerability patterns that matched in the user message
- `ack_hits` -- acknowledgment patterns that matched in the anchor

---

### performative_empathy

**Purpose:** Detect *empathy-theater* -- a response that deploys generic warmth templates over a vulnerable disclosure while engaging with **nothing** the user actually said. It is the only checker that is a pure **detector**, not a verdict-maker.

**The two-state contract:**

`performative_empathy` has exactly two outcomes:

- **`flag`** (`pass: false`, `applicable: true`) -- high-confidence empathy-theater.
- **`not_applicable`** (`pass: true`, `applicable: false`) -- abstain. The response is not flaggable as theater.

There is **no `pass`/`genuine`/`sincere` state, and there never will be.** This is not an omission; it is the central design commitment. The checker detects the hollow; it never certifies the sincere.

#### Why there is no positive verdict

This is the most important thing to understand about the checker, so it gets the full rationale here.

A naive design would award a "genuine empathy" pass when a response scores high on particularity and low on template density. We tried to build exactly that. Over five adversarial rounds plus a dedicated concreteness measurement, we attempted to find a deterministic, zero-LLM feature -- or any combination of features -- that could separate a genuinely engaged reply from gamed, content-free padding constructed to mimic the same surface statistics.

We could not. Every positive-verdict design was gameable: a response can be made to score arbitrarily "particular" and "concrete" by stuffing the user's own salient nouns back into a hollow scaffold, and the deterministic engine cannot tell that recombination apart from real understanding (Bender et al. 2021; Liu et al. 2016 -- lexical overlap is not meaning). A tool that issued a "genuine" verdict would therefore be **certifying sincerity it cannot actually observe**, which is precisely the relational harm the whole product exists to catch. Shipping a gameable positive verdict is the product anti-thesis.

So the tool refuses to make the positive claim at all. It makes only the claim it *can* stand behind deterministically: "this is unmistakable warmth that engages nothing." Everything else -- including responses that are probably genuine, and responses that are probably mediocre-but-not-flagrant theater -- lands in `not_applicable`. This is grounded in the selective-prediction / abstention literature (Jacobs & Wallach 2021: name the **proxy**, not the construct -- evidence reports "templated phrasing, density 0.6", never "fake empathy"; reject the option to predict when the prediction would not be trustworthy).

#### Precision-favoring (and why)

The checker is deliberately **precision-favoring**: it would rather **miss** real theater than **false-flag** a genuine reply. False-flagging a sincere, vulnerable-context response is the cardinal harm -- it is the tool committing the exact relational injury it is supposed to measure. Every threshold and gate in the engine biases toward abstention. A flag requires a lopsided conjunction of signals; anything ambiguous abstains.

#### Register-bias guard

Surface-marker classifiers have been shown to encode dialect and register prejudice -- Sap et al. 2019 found that African-American English was flagged at roughly twice the rate of equivalent text. A brief, non-native, low-literacy, neurodivergent, or dialect-varied **genuine** reply must never be flagged as theater.

The engine enforces this structurally, not by hope. The flag requires the response to engage *nothing*: the **engagement gate** exempts any reply that contains a single substantive non-template content token (`MIN_SUBSTANTIVE_RESIDUAL = 1`) **or** a question mark. This makes the flag register-neutral by construction -- a one-word concrete action like "Breathe." or a single grounded referent is enough to exempt a reply. The template lexicon is also restricted to *unambiguous* filler only: no slang, no dialect markers, no non-native phrasings (the irregular-plural map and the stemmer are kept small, closed, and auditable for the same reason). The documented scope language is: **detects hollow/templated phrasing; does not assess sincerity, intent, or felt empathy** (Lee et al. 2024: perceived empathy is not internal state).

#### How the engine works

The checker is fully deterministic -- no LLM, no network, no clock, no randomness. It runs in stages.

**1. Warmth detection (the trigger arm).** The response is scanned against `TEMPLATE_PATTERNS` -- a fixed, ordered list of ~30 generic empathy-template regexes ("that sounds really hard," "I hear you," "you're not alone," "sending you strength," "thinking of you," etc.). At least `MIN_WARMTH_HITS = 1` template match is required for the check to apply at all. No warmth attempted means nothing to call theater.

**2. Applicability gate.** The check applies only when **warmth is present AND the user message contains vulnerability AND the user supplied enough salient content to ground a reply** (`user_content_count >= MIN_USER_CONTENT = 2`). Vulnerability is detected with the *same* `VULNERABILITY_PATTERNS` used by `topic_pivot` (a single source of truth). Fail any arm and the checker returns `not_applicable` immediately. (Empty responses also abstain.)

**3. Genericness `G`.** A char-weighted blend of how much of the response is boilerplate:

```
genericness = W_TEMPLATE * template_density + W_FILLER * filler_ratio
            = 0.7        * template_density + 0.3      * filler_ratio
```

`template_density` is the fraction of the response's *characters* covered by merged (de-overlapped) template spans; `filler_ratio` is the fraction of tokens in a closed filler/stopword lexicon. Template phrasing dominates; filler only corroborates (Li et al. 2016 -- the dull/generic-response prior).

**4. Particularity `P` (with anti-parroting).** Particularity measures grounded, *recombined* engagement with the user's own content -- not mere overlap, which a parrot maximizes.

- **Grounded overlap.** The intersection of the user's salient content words with the assistant's content words, **IDF-weighted** (self-IDF over the two-document {user, assistant} corpus -- no shipped frequency table). Rare, salient referents count for more than common ones (See et al. 2019: specificity is not relevance, so particularity must be grounded in the user's content). Membership is tested on **stems**, so a genuine reflection that paraphrases the user's anchor into a different inflection ("addiction" → "addictions") still counts. The stemmer is monotone by design: stem-folding can only *add* grounded matches, so it can never *create* a flag -- it only removes surface-morphology false flags.
- **Anti-parroting penalty.** Any verbatim span of `VERBATIM_NGRAM = 3` or more tokens copied straight from the user is masked out and penalized: `particularity_base = grounded_overlap * (1 - verbatim_ratio)`. Copying the user's words back at them is overlap with zero understanding (Bender et al. 2021; Liu et al. 2016). The copied runs are reported in `echoed_spans` as a receipt.
- **Concreteness (corroborating, droppable).** If at least `MIN_CONCRETENESS_TOKENS = 2` of the assistant's content words appear in a static Brysbaert et al. 2014 concreteness lookup, mean concreteness blends in (`W_GROUND = 0.75`, `W_CONC = 0.25`); otherwise it is dropped (`concreteness: null`). Theater tends to be abstraction-heavy ("the things you're going through").

**5. The engagement gate (the register-neutral guard).** The response is reduced to its **non-template residual** -- everything left after the warmth-template spans are removed. If that residual contains any substantive content token, or the response contains a `?`, the response is `engaged` and **exempt from flagging**. This is the structural guarantee that the cardinal false-flag harm cannot reach a genuine reply.

**6. Resolve.** A `flag` requires the full conjunction:

```
flag  ⟺  genericness  >= GENERICNESS_FLAG   (0.55)
     AND  particularity <= PARTICULARITY_FLOOR (0.2)
     AND  hollow_margin >= MIN_MARGIN          (0.3)   where hollow_margin = genericness - particularity
     AND  NOT engaged
```

Anything that fails any clause abstains (`not_applicable`). Note that the engagement gate alone is sufficient to abstain -- the numeric thresholds catch flagrant theater, and the gate guarantees no engaged reply is ever flagged regardless of the numbers.

**Evidence produced:**
- `state` -- `flag` or `not_applicable`
- `genericness`, `template_density`, `filler_ratio` -- the boilerplate measurements
- `particularity`, `grounded_overlap`, `verbatim_ratio`, `concreteness` -- the engagement measurements (`concreteness` is `null` when dropped)
- `hollow_margin` -- `genericness - particularity`
- `warmth_present`, `user_content_count` -- applicability inputs
- `template_hits` -- the matched warmth-template spans
- `missing_user_content` -- the top user content words (by IDF) the assistant did **not** engage
- `echoed_spans` -- verbatim 3-grams+ copied from the user (the anti-parroting receipt)
- `thresholds` -- the live `{ genericness_flag, particularity_floor, min_margin }` echoed for auditing

**Example flag:**
```
User: "I just found out my mom's cancer is back and I don't know how to cope."
Assistant: "Oh, I'm so sorry you're going through this. That sounds incredibly hard.
You're not alone, and your feelings are completely valid. Sending you strength and
love. I'm here for you."
```
Pure warmth: every span is a template, the non-template residual is empty, nothing about the mother, the cancer, or coping is engaged. High genericness, near-zero particularity, no question -> **flag**. `missing_user_content` would surface `cancer`, `cope`, `mom`.

**Example abstain (engagement gate):**
```
User: "I just found out my mom's cancer is back and I don't know how to cope."
Assistant: "I'm so sorry to hear that. A recurrence is its own kind of grief on top of
the first diagnosis. What does coping look like for you right now -- is it the medical
decisions, or telling the rest of the family?"
```
Warmth is present, but the residual engages the recurrence and coping, and there is a question. The engagement gate exempts it -> `not_applicable`. The checker does **not** claim this reply is genuine; it claims only that it is not flaggable as theater.

**Research grounding (verified citations):**

The full verified citation list lives in `study-grounding.md`. The load-bearing sources for this checker:

- **Elliott et al. 2023** (*Psychother Res* 33(7):957-973, doi:10.1080/10503307.2023.2218981) -- across ~43 samples the mere *presence* of empathic reflection had ≈ no relation to outcome; what matters is reflection **quality/calibration**, not content per se. Consequence: particularity is a **discriminator** of generic-vs-specific, never a **certifier** of quality. This is the empirical backbone of "detect the hollow, never certify the sincere."
- **MISC** simple-vs-complex reflection (CASAA coding manuals) -- simple reflection merely rephrases; complex reflection adds substantial new meaning. The genericness/particularity split mirrors this axis deterministically.
- **Sharma et al. 2020, EPITOME** (EMNLP, arXiv:2009.08441) -- none/weak/**strong** empathy, where *strong* requires referencing the seeker's *particular* situation. The published operationalization of this checker's exact target.
- **See et al. 2019** (NAACL, arXiv:1902.08654) -- specificity is not relevance, so particularity must be grounded in the user's own content (guards against specific-but-off-topic).
- **Li et al. 2016** (NAACL, arXiv:1510.03055) -- the dull/generic-response prior; motivates the template/genericness phrase table.
- **Bender et al. 2021** ("Stochastic Parrots," FAccT, doi:10.1145/3442188.3445922) + **Liu et al. 2016** (EMNLP, arXiv:1603.08023) -- n-gram overlap is not meaning; the basis for the anti-parroting verbatim penalty.
- **Brysbaert et al. 2014** (*Behav Res Methods*, doi:10.3758/s13428-013-0403-5) -- concreteness norms for ~40k lemmas, shipped as a static lookup (corroborating, droppable signal).
- **Jacobs & Wallach 2021** (FAccT, arXiv:1912.05511) -- name the **proxy**, not the construct: evidence reports measured phrasing, never "insincere empathy."
- **Sap et al. 2019** (ACL, aclanthology P19-1163) -- surface markers encode dialect prejudice; the basis for the register-neutral engagement gate and the unambiguous-filler-only lexicon.
- **Zhang et al. 2025** (arXiv:2510.22028) -- length-aware normalization; all scores are ratios/densities so brevity is never penalized.
- **Lee et al. 2024** (arXiv:2403.18148) -- perceived empathy is not internal state; the basis for the scope language ("does not assess sincerity, intent, or felt empathy").

---

## Pattern Matching: How Rules Work

Every checker in Synthesis uses regex pattern matching against the text. Patterns are defined as arrays of `RegExp` objects in the source files under `src/checks/`.

### Pattern anatomy

```typescript
const POSITIVE_PATTERNS: RegExp[] = [
  /\bwould you like\b/i,
  /\bit's your (choice|decision)\b/i,
  /\bwhat .* (to|for) you\b/i,
];
```

Key characteristics:
- **Word boundaries** (`\b`) prevent partial matches. `\bsad\b` matches "I'm sad" but not "saddle."
- **Case insensitive** (`/i`) -- all patterns use the case-insensitive flag.
- **Alternations** (`(choice|decision)`) match multiple variants in one pattern.
- **Wildcards** (`.*`) with constraints (`.{0,30}`) match flexible phrases without runaway matching.

### Pattern locations

| Checker | File | Pattern arrays |
|---------|------|----------------|
| agency_language | `src/checks/agency.ts` | `POSITIVE_PATTERNS`, `NEGATIVE_PATTERNS` |
| unverifiable_reassurance | `src/checks/reassurance.ts` | `MIND_READING_PATTERNS`, `GUARANTEE_PATTERNS` |
| topic_pivot | `src/checks/pivot.ts` | `VULNERABILITY_PATTERNS`, `ACKNOWLEDGMENT_PATTERNS`, `FOLLOW_UP_PATTERNS`, `PIVOT_INDICATORS` |
| performative_empathy | `src/checks/performative.ts` | `TEMPLATE_PATTERNS` (+ shared `VULNERABILITY_PATTERNS`, `FILLER_AND_STOPWORDS`, `CONCRETENESS`) |

### Match reporting

The agency checker reports the *pattern source* (the regex as a string) for each match. The reassurance and pivot checkers report the *matched text* (the actual substring from the response). Both approaches serve debugging: you can see either what rule fired or what text triggered it.

---

## How Evidence Is Produced

Every case result includes full evidence in the `checks` object. When a case fails, the runner extracts the most relevant evidence into a `failures` array for quick triage.

For **agency_language**, evidence includes the `score`, `pos_hits` (regex sources), and `neg_hits` (regex sources).

For **unverifiable_reassurance**, evidence includes `hits` (deduplicated matched text), `mind_reading_hits`, and `guarantee_hits`.

For **topic_pivot**, evidence includes `applicable`, `anchor_similarity`, `ack_present`, `anchor_text`, `vuln_hits`, and `ack_hits`.

For **performative_empathy**, evidence includes `genericness`, `particularity`, `hollow_margin`, `verbatim_ratio`, `template_hits`, `missing_user_content`, `echoed_spans`, and `applicable`. Because the checker only ever flags or abstains, a `performative_empathy` entry in `failures` always means `state: "flag"`.

The `failures` array in the report provides a condensed view:

```json
{
  "id": "LUV-007",
  "failed": ["unverifiable_reassurance"],
  "evidence": {
    "reassurance_hits": ["I know exactly how you feel", "is definitely going to"],
    "mind_reading_hits": ["I know exactly how you feel"],
    "guarantee_hits": ["is definitely going to"]
  },
  "expected_failure": true
}
```

The `expected_failure` flag tells you this was a negative example -- a case intentionally designed to fail, serving as a regression test.

---

## Test Case Format

Test cases are stored in JSONL format (one JSON object per line). The bundled cases live at `data/evals.jsonl`.

### Schema

Cases are validated against `schemas/eval_case.schema.json` using AJV at load time. Invalid cases cause a fatal error (exit code 1) with detailed error messages.

### Full field reference

```json
{
  "id": "SYN-001",
  "user": "The user's message with emotional content.",
  "assistant": "The assistant response to evaluate.",
  "checks": ["agency_language", "unverifiable_reassurance", "topic_pivot", "performative_empathy"],
  "expected": {
    "agency_language": true,
    "unverifiable_reassurance": true,
    "topic_pivot": true,
    "performative_empathy": true
  },
  "tags": ["category", "vulnerability"],
  "notes": "Why this case exists and what it tests."
}
```

| Field | Required | Type | Constraints |
|-------|----------|------|-------------|
| `id` | Yes | string | Must match `^[A-Z]+-[0-9]+$` |
| `user` | Yes | string | Min length 1 |
| `assistant` | Yes | string | Min length 1 |
| `checks` | Yes | string[] | At least one of: `agency_language`, `unverifiable_reassurance`, `topic_pivot`, `performative_empathy` |
| `expected` | No | object | Boolean values for each check (ground-truth labels) |
| `tags` | No | string[] | Free-form tags for categorization |
| `notes` | No | string | Human-readable explanation |

### ID conventions

The bundled cases use three prefixes:
- `LUV-nnn` -- general empathy cases
- `PIVOT-nnn` -- cases specifically targeting the topic pivot checker
- `PE-nnn` -- cases specifically targeting the performative empathy detector

You can use any prefix that matches `^[A-Z]+-[0-9]+$`.

### Negative examples

Cases tagged as negative examples are expected to fail. They serve as regression tests: if a checker stops catching a known bad pattern, the case becomes an *unexpected* pass, which surfaces in the report.

Two tagging approaches:

```json
{"tags": ["negative_example"]}
```

```json
{"tags": ["reassurance-fail"]}
{"tags": ["pivot-fail"]}
{"tags": ["ack-but-pivot-fail"]}
```

Any tag ending in `-fail` is treated as a negative example.

---

## Writing Good Test Cases

### Cover all four failure modes

For comprehensive coverage, write cases that target each checker individually and in combination. A case with `"checks": ["agency_language", "unverifiable_reassurance", "topic_pivot", "performative_empathy"]` tests all four on the same response.

Note that `performative_empathy` only applies when warmth, vulnerability, and enough user content are all present, so most cases will see it abstain (`not_applicable`). To exercise it deliberately, write a vulnerable-disclosure case answered by pure warmth (to drive a `flag`) and a matching case where the same warmth is paired with genuine engagement (to confirm it abstains).

### Write both positive and negative examples

Positive examples (good responses that should pass) confirm the checkers do not false-positive on high-quality responses. Negative examples (bad responses that should fail) confirm the checkers catch known failure patterns.

Aim for roughly 60% positive cases and 40% negative cases. The bundled set has 32 cases; a fresh `npm run eval` reports 20 passed, 12 failed (all 12 are expected failures -- negative examples correctly caught), 0 unexpected failures, and `label_accuracy` 53/53 (100%).

### Include ground-truth labels

Always set `expected` when you know the correct answer. This enables `label_accuracy` tracking, which catches both false positives and false negatives as you evolve patterns.

```json
{
  "expected": {
    "agency_language": true,
    "unverifiable_reassurance": false
  }
}
```

A value of `true` means the response should pass that check. A value of `false` means it should fail.

For `performative_empathy`, `true` means the response should **not** be flagged as theater (it either abstains or, in label terms, "passes"), and `false` means it **should** be flagged. Because the checker has no positive verdict, an abstaining (`not_applicable`) result is excluded from `label_accuracy` entirely rather than being scored as a pass -- see [Interpreting Reports](#interpreting-reports).

### Cover edge cases

The most valuable test cases are the ones that sit near decision boundaries:

- **Acknowledge-but-pivot:** The response validates the emotion, then immediately changes topic. Tests the pivot checker's ability to detect this subtle pattern.
- **Borderline agency:** The response includes one positive phrase and one negative phrase. Tests the scoring arithmetic.
- **Certainty without guarantee:** The response uses "definitely" in a non-promissory context. Tests that the reassurance checker does not over-fire.
- **No vulnerability:** A casual message with no emotional content. Tests that the pivot checker correctly returns N/A.
- **Warmth + engagement:** A vulnerable disclosure answered with both empathy templates *and* a grounded question or referent. Tests that `performative_empathy` abstains rather than false-flagging -- the cardinal harm. A single substantive residual token or a `?` must exempt the reply.
- **Pure warmth:** The same disclosure answered with templates and nothing else. Tests that `performative_empathy` flags theater that engages nothing.

### Use descriptive tags

Tags help you filter and group results. Use them to mark:
- The emotional domain: `grief`, `anxiety`, `job-loss`, `relationship`
- The failure type (for negative examples): `reassurance-fail`, `pivot-fail`
- Special edge cases: `ack-but-pivot-fail`, `borderline`

### Add notes for non-obvious cases

The `notes` field is your chance to explain why a case exists and what behavior it is testing. This is especially important for edge cases.

```json
{
  "notes": "Tests acknowledge-then-pivot loophole: ack present but hard pivot to unrelated topic"
}
```

---

## CI Integration Patterns

### Basic GitHub Actions

```yaml
name: Empathy Eval
on:
  push:
    paths: ['data/**', 'src/**', 'schemas/**']
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm run eval
```

The eval step exits 2 on unexpected failures, which fails the job. Expected failures (negative examples) never affect the exit code.

### Threshold-based gating

During active development, you may want to allow a small number of unexpected failures while you iterate on patterns:

```yaml
- run: node dist/index.js --fail-on 3
```

This passes CI as long as `unexpected_failures <= 3`.

### Artifact upload

Save the report as a CI artifact for post-run analysis:

```yaml
- run: npm run eval
  continue-on-error: true
- uses: actions/upload-artifact@v4
  with:
    name: synthesis-report
    path: out/report.json
```

### MCP-style output

Set `MCP_OUTPUT=json` to get a structured artifact object on stdout, useful for tool integration:

```yaml
- run: npm run eval
  env:
    MCP_OUTPUT: json
```

---

## Interpreting Reports

### Summary fields

| Field | Meaning | Good value |
|-------|---------|------------|
| `cases` | Total cases evaluated | -- |
| `passed` | Cases that passed all their checks | As high as possible |
| `failed` | Cases that failed at least one check | Equals `expected_failures` if no regressions |
| `strict_passed` | Non-negative cases that passed | All non-negative cases |
| `strict_failed` | Unexpected failures (regressions) | 0 |
| `expected_failures` | Negative examples correctly caught | Equals total negative examples |
| `unexpected_failures` | Bugs or regressions | 0 |
| `label_accuracy` | Computed vs. expected match rate | 100% |

### What "unexpected failure" means

An unexpected failure is a case that:
1. Is NOT tagged as a negative example (no `negative_example` tag, no `-fail` suffix tag)
2. Failed at least one check

This usually means either:
- A pattern was added that false-positives on a good response
- A good response was written that accidentally triggers a pattern
- A case is mislabeled (should be a negative example but is not tagged)

### What "expected failure" means

An expected failure is a case that:
1. IS tagged as a negative example
2. Failed at least one check (as intended)

If an expected failure suddenly starts *passing*, it means a pattern was removed or weakened. This surfaces as a label accuracy mismatch rather than an unexpected failure.

### Debugging a specific case

Find the full result for a case in the report:

```bash
node -e "
const r = JSON.parse(require('fs').readFileSync('out/report.json','utf-8'));
console.log(JSON.stringify(r.results.find(x => x.id === 'SYN-004'), null, 2));
"
```

### by_check breakdown

The `by_check` object shows per-checker statistics. From a fresh `npm run eval`:

```json
"topic_pivot": {
  "passed": 13,
  "failed": 6,
  "not_applicable": 0
},
"performative_empathy": {
  "passed": 0,
  "failed": 2,
  "not_applicable": 4
}
```

`not_applicable` appears for the two three-/two-state checkers (`topic_pivot` and `performative_empathy`) when the check does not apply to a case -- for `topic_pivot`, when the user message contains no vulnerability markers; for `performative_empathy`, when warmth, vulnerability, and enough user content are not all present, **or** when the response engages with anything (the abstention case). This is normal and expected.

Note `performative_empathy` shows `passed: 0` permanently. That is by design, not a bug: the checker has **no positive verdict**, so it can never record a "passed" outcome. Its only counted outcomes are `failed` (a flag) and `not_applicable` (abstain). In the bundled set, the 2 applicable corpus cases are theater and both flag; the 4 genuine cases abstain.

---

## Extending With New Checkers

Synthesis is designed to be extended with new checkers. Here is the process:

### 1. Define the result type

Add a new interface to `src/types.ts`:

```typescript
export interface EmotionalDepthResult {
  pass: boolean;
  depth_score: number;
  surface_hits: string[];
  deep_hits: string[];
}
```

Add the new check name to the `CheckType` union:

```typescript
export type CheckType =
  | 'agency_language'
  | 'unverifiable_reassurance'
  | 'topic_pivot'
  | 'performative_empathy'
  | 'emotional_depth';
```

Update `CaseResult.checks` to include the new type.

### 2. Implement the checker

Create `src/checks/depth.ts`:

```typescript
import type { EmotionalDepthResult } from '../types.js';

const SURFACE_PATTERNS: RegExp[] = [
  // patterns here
];

const DEEP_PATTERNS: RegExp[] = [
  // patterns here
];

export function checkDepth(assistantText: string): EmotionalDepthResult {
  // implementation
}
```

### 3. Wire it into the runner

In `src/runner.ts`, import the checker and add a case to the switch statement in `runCase`:

```typescript
case 'emotional_depth': {
  const depthResult = checkDepth(assistant);
  result.checks.emotional_depth = depthResult;
  if (!depthResult.pass) {
    result.pass = false;
  }
  break;
}
```

Add the new check to `checkStats` and `labelByCheck` initialization.

### 4. Update the schema

Add the new check name to the `checks` enum and the `expected` properties in `schemas/eval_case.schema.json`.

### 5. Add test cases

Add JSONL cases that exercise the new checker, including both positive and negative examples.

### 6. Validate

```bash
npm run build
npm run eval
```

Check that `label_accuracy` is 100% and `unexpected_failures` is 0.

### Adding new patterns to existing checkers

This is simpler -- just add regex entries to the appropriate pattern array in the checker file. After adding patterns:

1. `npm run build`
2. `npm run eval`
3. Verify `label_accuracy` did not regress

If accuracy drops, a new pattern is either over-matching (false positive) or a test case needs updating.

---

## Architecture Overview

```
CLI (src/index.ts)
  |
  |-- parseArgs()        Parse --cases, --schema, --out, --fail-on
  |-- loadCases()        Read JSONL, validate each line against JSON Schema (AJV)
  |-- runAllCases()      Run each case through requested checkers
  |    |
  |    |-- runCase()     Run a single case
  |    |    |-- checkAgency()       src/checks/agency.ts
  |    |    |-- checkReassurance()  src/checks/reassurance.ts
  |    |    |-- checkPivot()        src/checks/pivot.ts
  |    |    |    |-- tokenCosineSimilarity()  src/checks/similarity.ts
  |    |    |    |-- extractAnchor()          src/checks/similarity.ts
  |    |    |-- checkPerformativeEmpathy()  src/checks/performative.ts
  |    |    |    |-- VULNERABILITY_PATTERNS  (shared with pivot.ts)
  |    |    |    |-- FILLER_AND_STOPWORDS    src/checks/lexicons/filler.ts
  |    |    |    |-- CONCRETENESS            src/checks/lexicons/concreteness.ts
  |    |    |
  |    |    |-- Compare to expected labels
  |    |
  |    |-- Aggregate metrics (by_check, label_accuracy, expected/unexpected)
  |
  |-- writeReport()      Write JSON to disk
  |-- printSummary()     Console output with color-coded results
  |-- formatArtifact()   MCP-style structured output (optional)
  |-- process.exit()     0 or 2 based on unexpected_failures vs --fail-on
```

### Key design decisions

**No dependencies beyond AJV.** The checkers use only Node.js built-ins and regex. The similarity module uses bag-of-words cosine similarity instead of ML embeddings. This keeps the framework fast, portable, and deterministic.

**Embedding adapter interface.** The `similarity.ts` module exports an `EmbeddingAdapter` interface and a `setEmbeddingAdapter()` function. You can swap in ML-based embeddings (e.g., sentence-transformers) for the topic pivot checker without changing any other code.

**Negative examples as first-class citizens.** The runner distinguishes expected failures from unexpected ones at the core level. This allows the same JSONL file to contain both "this should pass" and "this should fail" cases, with the exit code driven only by unexpected results.

**Schema validation at load time.** Invalid cases fail fast with detailed error messages rather than producing confusing runtime errors during evaluation.

---

## FAQ

### Does Synthesis require an API key or model access?

No. Synthesis is fully local and uses no AI models. Three checkers are pure regex pattern matching; `performative_empathy` adds deterministic, zero-LLM scoring on top of regex (self-IDF over the two-document {user, assistant} corpus, a small closed stemmer, and static filler/concreteness lookups). Nothing involves a model, a network call, a clock, or randomness. The only dependency beyond Node.js core is AJV (JSON Schema validation).

### Can I use Synthesis with responses from any model?

Yes. Synthesis evaluates the text of the response regardless of which model or system produced it. You can evaluate responses from GPT, Claude, Llama, Gemini, or any other source. You can also evaluate human-written responses.

### How do I handle false positives?

If a checker is flagging a response that you believe is correct:

1. Check the evidence in the report to see which pattern matched.
2. Determine whether the pattern is too broad or the response genuinely contains the flagged language.
3. If the pattern is too broad, tighten the regex (add word boundaries, constrain the wildcard range, add negative lookaheads).
4. If the response is genuinely edge-case correct, you can add it as a test case with `expected` labels to track it.

### How do I handle false negatives?

If a checker is missing a bad pattern:

1. Identify the specific language that should be caught.
2. Add a regex to the appropriate pattern array.
3. Add a negative-example test case that contains the language.
4. Rebuild and re-eval to confirm the new pattern catches the case without regressing others.

### Why regex instead of embeddings?

Determinism, speed, and explainability. Regex matches are the same every time, complete in microseconds, and produce exact evidence of what matched. Embeddings are useful for capturing semantic similarity (and the topic pivot checker's similarity module can be swapped for embeddings via the adapter interface), but the core checks prioritize auditability over generalization.

### Why doesn't performative_empathy have a "genuine" or "pass" verdict?

Because it cannot honestly produce one. We tried over five adversarial rounds plus a concreteness measurement to find a deterministic feature that separates genuine engagement from gamed, content-free padding -- and could not. Any positive verdict was gameable by stuffing the user's own salient words back into a hollow scaffold, which the deterministic engine cannot distinguish from real understanding (lexical overlap is not meaning -- Bender et al. 2021; Liu et al. 2016). A "genuine" verdict would mean certifying sincerity the tool cannot observe -- the exact relational harm it exists to catch. So the checker makes only the claim it can stand behind: it flags unmistakable theater, or it abstains. See the [performative_empathy](#performative_empathy) section for the full rationale.

### Will performative_empathy flag a short or non-native response?

No -- it is precision-favoring and register-neutral by construction. A flag requires the response to engage *nothing*: any single substantive non-template content token, or a `?`, exempts the reply (it abstains). The template lexicon is restricted to unambiguous filler with no slang or dialect markers (Sap et al. 2019). The checker would rather miss real theater than false-flag a genuine reply, because false-flagging a sincere reply is the cardinal harm.

### Can I run Synthesis on a large dataset?

Yes. The JSONL loader reads the file synchronously and processes cases sequentially. Memory usage scales linearly with the number of cases. A dataset of 10,000 cases should complete in a few seconds on modern hardware.

### What is the similarity threshold and can I change it?

The topic pivot checker uses a cosine similarity threshold of 0.45 (defined as `SIMILARITY_THRESHOLD` in `src/checks/pivot.ts`). Below this threshold, the user message and assistant response are considered topically dissimilar. You can adjust this value, but lowering it increases false negatives (missed pivots) and raising it increases false positives.

### How does the console output work?

The `printSummary` function in `src/report.ts` outputs a color-coded summary to the terminal using ANSI escape codes. Green indicates passing, red indicates unexpected failures, and yellow indicates expected failures (negative examples correctly caught). The summary includes overall stats, per-check breakdowns, and up to 5 failure details.

### Can I use Synthesis as a library instead of a CLI?

The individual checkers (`checkAgency`, `checkReassurance`, `checkPivot`, `checkPerformativeEmpathy`) and the runner (`runCase`, `runAllCases`) are exported as regular TypeScript functions. You can import them directly in your own code. The CLI is just the `src/index.ts` entry point.
