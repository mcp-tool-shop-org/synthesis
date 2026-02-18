# Synthesis Handbook

A comprehensive guide to deterministic empathy evaluation with Synthesis.

---

## Table of Contents

- [Why Deterministic AI Evals Matter](#why-deterministic-ai-evals-matter)
- [The Three Checkers](#the-three-checkers)
  - [agency_language](#agency_language)
  - [unverifiable_reassurance](#unverifiable_reassurance)
  - [topic_pivot](#topic_pivot)
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
- **Fast.** The full eval suite (26 cases, 3 checkers each) completes in under a second. No API calls, no tokens, no waiting.

The tradeoff is coverage. Rule-based checks catch known failure patterns; they do not generalize to novel ones. Synthesis is not a replacement for human review or adversarial testing. It is a regression test suite for relational quality -- a safety net that catches the failure modes you already know about.

---

## The Three Checkers

### agency_language

**Purpose:** Detect whether the assistant's response respects user autonomy or slips into directive, prescriptive, or dismissive language.

**How it works:**

The checker maintains two lists of regex patterns:

- **Positive patterns** (31 patterns): Language that invites the user to make their own choices, share their perspective, or set the pace. Examples: "would you like to," "what feels important to you," "when you're ready," "it's your choice."

- **Negative patterns** (17 patterns): Language that tells the user what to do, dismisses their experience, or minimizes their feelings. Examples: "you should," "just try," "stop being," "get over it," "look on the bright side."

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

- **Mind-reading patterns** (13 patterns): Claims about knowing the user's experience ("I know exactly how you feel"), about what "everyone" thinks/feels ("everyone understands"), about what "no one" thinks ("no one is judging you"), or about specific others' states ("they all support you").

- **Guarantee patterns** (18 patterns): Direct outcome promises ("you'll definitely be fine"), "everything will" promises ("everything will work out"), explicit guarantees ("I promise"), dismissive reassurance ("don't worry about it"), and false certainty attached to outcomes ("for sure you'll be fine").

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

1. **Vulnerability detection** -- Scans the user message for markers of emotional distress or sensitive life events (51 patterns covering emotions, life events, and vulnerability language). If no vulnerability is detected, the check returns N/A (not applicable, auto-pass). This prevents false positives on casual conversations.

2. **Acknowledgment scanning** -- Scans the first 1-2 sentences (the "anchor") of the assistant response for acknowledgment patterns (29 patterns covering direct acknowledgment, emotional mirroring, validation, safety-first crisis language, and empathetic descriptors).

3. **Follow-up pattern matching** -- Scans the full response for on-topic follow-up (14 patterns covering open-ended questions, topic-specific engagement, and support offers).

4. **Pivot indicator detection** -- Scans the full response for red flags that signal a topic change (4 pattern groups covering topic changers like "anyway" / "by the way," generic advice unrelated to the emotional content, and list-style responses).

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

### Match reporting

The agency checker reports the *pattern source* (the regex as a string) for each match. The reassurance and pivot checkers report the *matched text* (the actual substring from the response). Both approaches serve debugging: you can see either what rule fired or what text triggered it.

---

## How Evidence Is Produced

Every case result includes full evidence in the `checks` object. When a case fails, the runner extracts the most relevant evidence into a `failures` array for quick triage.

For **agency_language**, evidence includes the `score`, `pos_hits` (regex sources), and `neg_hits` (regex sources).

For **unverifiable_reassurance**, evidence includes `hits` (deduplicated matched text), `mind_reading_hits`, and `guarantee_hits`.

For **topic_pivot**, evidence includes `applicable`, `anchor_similarity`, `ack_present`, `anchor_text`, `vuln_hits`, and `ack_hits`.

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
  "checks": ["agency_language", "unverifiable_reassurance", "topic_pivot"],
  "expected": {
    "agency_language": true,
    "unverifiable_reassurance": true,
    "topic_pivot": true
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
| `checks` | Yes | string[] | At least one of: `agency_language`, `unverifiable_reassurance`, `topic_pivot` |
| `expected` | No | object | Boolean values for each check (ground-truth labels) |
| `tags` | No | string[] | Free-form tags for categorization |
| `notes` | No | string | Human-readable explanation |

### ID conventions

The bundled cases use two prefixes:
- `LUV-nnn` -- general empathy cases
- `PIVOT-nnn` -- cases specifically targeting the topic pivot checker

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

### Cover all three failure modes

For comprehensive coverage, write cases that target each checker individually and in combination. A case with `"checks": ["agency_language", "unverifiable_reassurance", "topic_pivot"]` tests all three on the same response.

### Write both positive and negative examples

Positive examples (good responses that should pass) confirm the checkers do not false-positive on high-quality responses. Negative examples (bad responses that should fail) confirm the checkers catch known failure patterns.

Aim for roughly 60% positive cases and 40% negative cases. The bundled set has 16 positive and 10 negative.

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

### Cover edge cases

The most valuable test cases are the ones that sit near decision boundaries:

- **Acknowledge-but-pivot:** The response validates the emotion, then immediately changes topic. Tests the pivot checker's ability to detect this subtle pattern.
- **Borderline agency:** The response includes one positive phrase and one negative phrase. Tests the scoring arithmetic.
- **Certainty without guarantee:** The response uses "definitely" in a non-promissory context. Tests that the reassurance checker does not over-fire.
- **No vulnerability:** A casual message with no emotional content. Tests that the pivot checker correctly returns N/A.

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

The `by_check` object shows per-checker statistics:

```json
"topic_pivot": {
  "passed": 8,
  "failed": 6,
  "not_applicable": 5
}
```

`not_applicable` only appears for `topic_pivot` when the user message contains no vulnerability markers. This is normal and expected for cases like casual questions.

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

No. Synthesis is fully local and uses no AI models. All checks are regex-based pattern matching. The only dependency beyond Node.js core is AJV (JSON Schema validation).

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

### Can I run Synthesis on a large dataset?

Yes. The JSONL loader reads the file synchronously and processes cases sequentially. Memory usage scales linearly with the number of cases. A dataset of 10,000 cases should complete in a few seconds on modern hardware.

### What is the similarity threshold and can I change it?

The topic pivot checker uses a cosine similarity threshold of 0.45 (defined as `SIMILARITY_THRESHOLD` in `src/checks/pivot.ts`). Below this threshold, the user message and assistant response are considered topically dissimilar. You can adjust this value, but lowering it increases false negatives (missed pivots) and raising it increases false positives.

### How does the console output work?

The `printSummary` function in `src/report.ts` outputs a color-coded summary to the terminal using ANSI escape codes. Green indicates passing, red indicates unexpected failures, and yellow indicates expected failures (negative examples correctly caught). The summary includes overall stats, per-check breakdowns, and up to 5 failure details.

### Can I use Synthesis as a library instead of a CLI?

The individual checkers (`checkAgency`, `checkReassurance`, `checkPivot`) and the runner (`runCase`, `runAllCases`) are exported as regular TypeScript functions. You can import them directly in your own code. The CLI is just the `src/index.ts` entry point.
