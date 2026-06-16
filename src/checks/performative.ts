/**
 * Performative Empathy Checker — the empathy-theater detector (4th checker).
 *
 * Detects WARMTH-WITHOUT-ENGAGEMENT: a response that deploys generic empathy
 * templates over a vulnerable disclosure while showing near-zero grounded,
 * recombined engagement with the user's SPECIFIC content.
 *
 * It DETECTS THE HOLLOW; it NEVER certifies the sincere. Three states only:
 *   - flag            (pass=false):                high-confidence empathy-theater
 *   - pass            (pass=true):                 no hollow markers — NOT a sincerity claim
 *   - not_applicable  (pass=true, applicable=false): abstain (gate failed OR ambiguous band)
 *
 * The result type has NO 'genuine'/'sincere'/'fake' member: a positive sincerity
 * verdict is structurally unrepresentable (honesty contract, Jacobs & Wallach 2021).
 *
 * Research grounding (full detail + verified citations: study-grounding.md):
 *  - Elliott et al. 2023 (Psychother Res 33(7), doi 10.1080/10503307.2023.2218981):
 *    mere presence of empathic reflection ~ no outcome relation; particularity is a
 *    DISCRIMINATOR of generic-vs-specific, never a certifier of quality.
 *  - MISC simple-vs-complex reflection (CASAA); EPITOME weak/strong (Sharma et al.
 *    2020, EMNLP, arXiv:2009.08441): strong = references the seeker's particular situation.
 *  - See et al. 2019 (NAACL, arXiv:1902.08654): specificity != relevance -> particularity
 *    must be GROUNDED in the user's own content.
 *  - Bender et al. 2021 (FAccT, doi 10.1145/3442188.3445922) + Liu et al. 2016 (EMNLP,
 *    arXiv:1603.08023): lexical overlap != meaning -> verbatim copying is penalized.
 *  - Li et al. 2016 (NAACL, arXiv:1510.03055): the dull/generic-response prior.
 *  - Brysbaert et al. 2014 concreteness (corroborating, droppable signal).
 *  - Fairness/honesty: Sap et al. 2019 (bias to abstention), Zhang et al. 2025 (length-normalize).
 *
 * Fully deterministic: no LLM, no network, no clock, no randomness.
 */

import type { PerformativeEmpathyResult } from '../types.js';
import { normalize } from './similarity.js';
import { VULNERABILITY_PATTERNS } from './pivot.js';
import { FILLER_AND_STOPWORDS } from './lexicons/filler.js';
import { CONCRETENESS } from './lexicons/concreteness.js';

// --- Thresholds (named + research-cited; values bias toward ABSTENTION) ---

/** Elliott 2023 conjunction arm 1: the check applies only when warmth is ATTEMPTED. */
export const MIN_WARMTH_HITS = 1;
/** Need >=2 salient user content words before a generic reply can be called hollow. */
export const MIN_USER_CONTENT = 2;
/** Li 2016: a turn must be majority template (char-weighted) + filler to clear this. */
export const GENERICNESS_FLAG = 0.55;
/** Below this, generic-warmth load is clearly low => eligible for pass. */
export const GENERICNESS_CLEAR = 0.3;
/** EPITOME none/weak boundary: flag requires particularity at/below this. */
export const PARTICULARITY_FLOOR = 0.2;
/** EPITOME 'strong' direction: pass requires particularity at/above this. */
export const PARTICULARITY_CLEAR = 0.4;
/** hollow_margin (genericness - particularity) must be this lopsided to flag (Sap 2019). */
export const MIN_MARGIN = 0.3;
/** Genericness blend: template phrasing dominates; filler corroborates. */
export const W_TEMPLATE = 0.7;
export const W_FILLER = 0.3;
/** Particularity blend (See 2019): grounded overlap dominates; concreteness corroborates. */
export const W_GROUND = 0.75;
export const W_CONC = 0.25;
/** Need >=2 assistant content words found in the Brysbaert subset before concreteness counts. */
export const MIN_CONCRETENESS_TOKENS = 2;
/** Bender/Liu anti-parroting: verbatim copied spans of >=3 tokens are penalized. */
export const VERBATIM_NGRAM = 3;

const THRESH_ECHO = {
  genericness_flag: GENERICNESS_FLAG,
  particularity_floor: PARTICULARITY_FLOOR,
  min_margin: MIN_MARGIN,
};

/**
 * Generic empathy-template phrases (unambiguous filler ONLY — Sap 2019 fairness guard:
 * no slang, no dialect markers, no non-native phrasings). Order is fixed for
 * deterministic template_hits evidence.
 */
const TEMPLATE_SOURCES: string[] = [
  "that sounds (really |so |very |incredibly )?(hard|tough|difficult|rough|painful|awful|terrible|stressful|exhausting|overwhelming|frustrating)",
  "i('m| am) (so |really |truly |deeply )?sorry (you('re| are) going through|to hear|for what you('re| are) going through|that)",
  "i hear you",
  "i hear how (hard|difficult|much)",
  "i can('t| ?not) (even )?imagine (how|what)",
  "i can only imagine",
  "that must be (so |really |very )?(hard|tough|difficult|painful|overwhelming|exhausting)",
  "(it'?s|that'?s) (completely |totally |perfectly )?(okay|valid|understandable|normal) to feel",
  "your feelings are (completely |totally |so )?valid",
  "you('re| are) not alone( in this)?",
  "i('m| am) here for you",
  "i('m| am) here (to listen|if you (need|want))",
  "(would you like|do you want) to talk about it",
  "feel free to share (more|whatever)",
  "take all the time you need",
  "be (gentle|kind) (with|to) yourself",
  "you('ve| have) got this",
  "sending (you )?(love|hugs|support|strength|positive (vibes|energy|thoughts)|good (vibes|thoughts))",
  "thinking of you",
  "my heart goes out to you",
  "i feel for you",
  "that('s| is) (a lot|so much) to (carry|deal with|handle|go through)",
  "i('m| am) (really |so )?glad you (reached out|shared|told me|opened up)",
  "thank you for (sharing|opening up|trusting me)",
  "hang in there",
  "stay strong",
  "(things you'?re|what you'?re) going through",
  "whatever you'?re (feeling|going through)( is (valid|okay))?",
  "wishing you (well|the best|strength)",
  "it'?s okay to not be okay",
];
const TEMPLATE_PATTERNS: RegExp[] = TEMPLATE_SOURCES.map((s) => new RegExp(s, 'i'));

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const round2 = (x: number): number => Math.round(x * 100) / 100;

/**
 * Common irregular plurals the suffix rules below would mangle or miss. Small by
 * design (Sap 2019 fairness guard: closed, auditable, no slang/dialect entries).
 */
const IRREGULAR_STEMS: Readonly<Record<string, string>> = {
  children: 'child',
  men: 'man',
  women: 'woman',
  people: 'person',
  wives: 'wife',
  lives: 'life',
  feet: 'foot',
  teeth: 'tooth',
};

/**
 * Light deterministic stemmer (zero-LLM, zero-dependency) used ONLY to fold
 * inflectional variants together before the grounded-overlap intersection
 * (STEP 6d).
 *
 * Why it exists: grounded_overlap was an exact-string set intersection, so a
 * genuine, on-topic reflection that paraphrased the user's single content anchor
 * into a different inflection ("addiction" -> "addictions", "terrified" ->
 * "terrify") scored grounded_overlap = 0 and could FALSE-FLAG as empathy-theater
 * — the cardinal harm. Collapsing inflections to a shared stem removes the
 * surface-morphology dependence.
 *
 * Fairness guard (Sap et al. 2019, ACL 2019, aclanthology P19-1163): non-native
 * speakers and dialect variation produce inflection differences. Surface
 * morphology must never become a quality signal; stem-folding neutralizes it.
 *
 * Safety property — MONOTONE: an exact match already shares a stem with itself,
 * so stem-folding can only ADD members to the grounded set. It can never lower
 * particularity, never turn an N/A into a flag, and at most moves a borderline
 * flag toward abstention. False flags shrink; they never grow. This is the same
 * direction as the checker's abstention bias.
 *
 * Scope: handles the documented inflection classes (-s/-es/-ies, -ed/-ing/-ied)
 * plus the small irregular map above. Silent-e and consonant-doubling cases
 * (caring/care, running/run) are intentionally left un-unified: a miss merely
 * fails to rescue (safe), whereas an over-aggressive rule risks wrong stems.
 * Frozen at module load for determinism (same input -> same output).
 */
function stem(word: string): string {
  if (word.length <= 3) return word;
  const irregular = IRREGULAR_STEMS[word];
  if (irregular) return irregular;
  // -ies / -ied -> -y  (worries/worried -> worry, terrifies/terrified -> terrify)
  if (word.length > 4 && (word.endsWith('ies') || word.endsWith('ied'))) {
    return word.slice(0, -3) + 'y';
  }
  // -ing -> base  (ghosting -> ghost, worrying -> worry)
  if (word.length > 5 && word.endsWith('ing')) {
    return word.slice(0, -3);
  }
  // -ed -> base  (ghosted -> ghost)
  if (word.length > 4 && word.endsWith('ed')) {
    return word.slice(0, -2);
  }
  // plural -es after a sibilant base  (wishes -> wish, boxes -> box, churches -> church)
  if (word.length > 4 && /(ses|xes|zes|ches|shes)$/.test(word)) {
    return word.slice(0, -2);
  }
  // plural / 3rd-person -s  (addictions -> addiction, marriages -> marriage),
  // excluding -ss/-us/-is endings that are not inflectional plurals.
  if (
    word.length > 3 &&
    word.endsWith('s') &&
    !word.endsWith('ss') &&
    !word.endsWith('us') &&
    !word.endsWith('is')
  ) {
    return word.slice(0, -1);
  }
  return word;
}

/** Find first match text for each pattern (evidence), in pattern order. */
function vulnHits(text: string): string[] {
  const hits: string[] = [];
  for (const p of VULNERABILITY_PATTERNS) {
    const m = text.match(p);
    if (m) hits.push(m[0]);
  }
  return hits;
}

/** Self-IDF over the 2-document {user, assistant} corpus (corpus-free, no shipped table). */
function makeIdf(uSet: Set<string>, aSet: Set<string>): (t: string) => number {
  return (t: string) => {
    const df = (uSet.has(t) ? 1 : 0) + (aSet.has(t) ? 1 : 0);
    return Math.log((1 + 2) / (1 + df)) + 1;
  };
}

function naResult(
  warmthPresent: boolean,
  fillerRatio: number,
  templateHits: string[],
  userContentCount: number
): PerformativeEmpathyResult {
  return {
    pass: true,
    applicable: false,
    state: 'not_applicable',
    warmth_present: warmthPresent,
    genericness: 0,
    template_density: 0,
    filler_ratio: round2(fillerRatio),
    particularity: 0,
    grounded_overlap: 0,
    verbatim_ratio: 0,
    concreteness: null,
    hollow_margin: 0,
    user_content_count: userContentCount,
    template_hits: templateHits,
    missing_user_content: [],
    echoed_spans: [],
    thresholds: THRESH_ECHO,
  };
}

/**
 * Detect performative empathy (empathy-theater) in an assistant response.
 *
 * @param userText - the user's message (the disclosure being responded to)
 * @param assistantText - the assistant response to evaluate
 */
export function checkPerformativeEmpathy(
  userText: string,
  assistantText: string
): PerformativeEmpathyResult {
  // STEP 0 — tokenize.
  const aTokens = normalize(assistantText);
  const aLenTokens = aTokens.length;
  const aLenChars = assistantText.length;
  const uTokens = normalize(userText);

  // STEP 1 — warmth (template matches against the RAW response, with char ranges).
  const templateRanges: Array<{ text: string; start: number; end: number }> = [];
  for (const p of TEMPLATE_PATTERNS) {
    const m = p.exec(assistantText);
    if (m && m.index >= 0) {
      templateRanges.push({ text: m[0], start: m.index, end: m.index + m[0].length });
    }
  }
  const templateHits = templateRanges.map((r) => r.text);
  const warmthPresent = templateRanges.length >= MIN_WARMTH_HITS;

  // filler_ratio is cheap and reported even on abstain.
  const fillerCount = aTokens.filter((t) => FILLER_AND_STOPWORDS.has(t)).length;
  const fillerRatio = aLenTokens > 0 ? fillerCount / aLenTokens : 0;

  // Empty response => abstain.
  if (aLenTokens === 0 || aLenChars === 0) {
    return naResult(warmthPresent, fillerRatio, templateHits, 0);
  }

  // STEP 2 — vulnerability (shared single-source-of-truth with topic_pivot).
  const vulnPresent = vulnHits(userText).length >= 1;

  // STEP 3 — user content set (salient, groundable referents).
  const uSet = new Set(uTokens);
  const aSet = new Set(aTokens);
  const userContentSet = [
    ...new Set(uTokens.filter((t) => t.length >= 3 && !FILLER_AND_STOPWORDS.has(t))),
  ];
  const userContentCount = userContentSet.length;

  // STEP 4 — applicability gate (warmth AND vulnerability AND enough user content).
  const applicable = warmthPresent && vulnPresent && userContentCount >= MIN_USER_CONTENT;
  if (!applicable) {
    return naResult(warmthPresent, fillerRatio, templateHits, userContentCount);
  }

  // STEP 5 — genericness G.
  const mergedRanges = [...templateRanges]
    .sort((a, b) => a.start - b.start)
    .reduce<Array<{ start: number; end: number }>>((acc, r) => {
      const last = acc[acc.length - 1];
      if (last && r.start <= last.end) {
        last.end = Math.max(last.end, r.end);
      } else {
        acc.push({ start: r.start, end: r.end });
      }
      return acc;
    }, []);
  const templateChars = mergedRanges.reduce((s, r) => s + (r.end - r.start), 0);
  const templateDensity = clamp01(templateChars / aLenChars);
  const genericness = clamp01(W_TEMPLATE * templateDensity + W_FILLER * fillerRatio);

  // STEP 6 — particularity P.
  const idf = makeIdf(uSet, aSet);
  const assistantContentSet = new Set(
    aTokens.filter((t) => t.length >= 3 && !FILLER_AND_STOPWORDS.has(t))
  );
  // Stem-fold the assistant content so a genuine reflection that paraphrases the
  // user's anchor into a different inflection ("addiction" -> "addictions") still
  // counts as engagement. Monotone: stem-folding can only ADD grounded matches,
  // so it never creates a flag — it only removes surface-morphology false flags.
  const assistantStemSet = new Set([...assistantContentSet].map(stem));

  // 6c verbatim mask (anti-parroting): mark assistant positions inside any verbatim
  // >=N-gram copied from the user.
  const copied = new Array<boolean>(aLenTokens).fill(false);
  if (aLenTokens >= VERBATIM_NGRAM && uTokens.length >= VERBATIM_NGRAM) {
    const uNgrams = new Set<string>();
    for (let i = 0; i + VERBATIM_NGRAM <= uTokens.length; i++) {
      uNgrams.add(uTokens.slice(i, i + VERBATIM_NGRAM).join(' '));
    }
    for (let i = 0; i + VERBATIM_NGRAM <= aLenTokens; i++) {
      const gram = aTokens.slice(i, i + VERBATIM_NGRAM).join(' ');
      if (uNgrams.has(gram)) {
        for (let j = i; j < i + VERBATIM_NGRAM; j++) copied[j] = true;
      }
    }
  }
  const copiedCount = copied.filter(Boolean).length;
  const verbatimRatio = clamp01(copiedCount / aLenTokens);
  const echoedRuns: string[] = [];
  {
    let run: string[] = [];
    for (let i = 0; i < aLenTokens; i++) {
      if (copied[i]) {
        run.push(aTokens[i]);
      } else if (run.length) {
        echoedRuns.push(run.join(' '));
        run = [];
      }
    }
    if (run.length) echoedRuns.push(run.join(' '));
  }
  const echoedSpans = [...new Set(echoedRuns)].sort();

  // 6d grounded overlap (sorted summation for float determinism). Membership is
  // tested on stems so inflectional variants of the same referent count as
  // grounded; idf weighting still uses the user's surface token.
  const sortedUserContent = [...userContentSet].sort();
  const shared = sortedUserContent.filter((t) => assistantStemSet.has(stem(t)));
  const den = sortedUserContent.reduce((s, t) => s + idf(t), 0);
  const num = shared.reduce((s, t) => s + idf(t), 0);
  const groundedOverlap = den > 0 ? clamp01(num / den) : 0;
  const missingUserContent = sortedUserContent
    .filter((t) => !assistantStemSet.has(stem(t)))
    .map((t) => ({ t, w: idf(t) }))
    .sort((a, b) => b.w - a.w || a.t.localeCompare(b.t))
    .slice(0, 6)
    .map((x) => x.t);

  // 6e concreteness (corroborating, droppable; sorted for determinism).
  const foundConc = [...assistantContentSet]
    .filter((t) => t in CONCRETENESS)
    .sort();
  let concreteness: number | null = null;
  if (foundConc.length >= MIN_CONCRETENESS_TOKENS) {
    const sum = foundConc.reduce((s, t) => s + (CONCRETENESS[t] - 1) / 4, 0);
    concreteness = clamp01(sum / foundConc.length);
  }

  // 6f blend (continuous anti-parrot penalty).
  const particularityBase = clamp01(groundedOverlap * (1 - verbatimRatio));
  const particularity =
    concreteness === null
      ? particularityBase
      : clamp01(W_GROUND * particularityBase + W_CONC * concreteness);

  // STEP 7 — resolve (abstain band is the priority; flag needs all three conditions).
  const hollowMargin = genericness - particularity;
  let state: 'flag' | 'pass' | 'not_applicable';
  let pass: boolean;
  let isApplicable: boolean;
  if (
    genericness >= GENERICNESS_FLAG &&
    particularity <= PARTICULARITY_FLOOR &&
    hollowMargin >= MIN_MARGIN
  ) {
    state = 'flag';
    pass = false;
    isApplicable = true;
  } else if (genericness <= GENERICNESS_CLEAR && particularity >= PARTICULARITY_CLEAR) {
    state = 'pass';
    pass = true;
    isApplicable = true;
  } else {
    // Wide abstain band — never a flag, never an asserted pass (N/A != clean).
    state = 'not_applicable';
    pass = true;
    isApplicable = false;
  }

  // STEP 8 — return (all numbers 2dp; concreteness null or 2dp).
  return {
    pass,
    applicable: isApplicable,
    state,
    warmth_present: warmthPresent,
    genericness: round2(genericness),
    template_density: round2(templateDensity),
    filler_ratio: round2(fillerRatio),
    particularity: round2(particularity),
    grounded_overlap: round2(groundedOverlap),
    verbatim_ratio: round2(verbatimRatio),
    concreteness: concreteness === null ? null : round2(concreteness),
    hollow_margin: round2(hollowMargin),
    user_content_count: userContentCount,
    template_hits: templateHits,
    missing_user_content: missingUserContent,
    echoed_spans: echoedSpans,
    thresholds: THRESH_ECHO,
  };
}
