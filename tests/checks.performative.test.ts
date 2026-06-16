/**
 * Performative Empathy Checker Tests (empathy-theater detector)
 *
 * Tests for src/checks/performative.ts. Every fixture's verdict was verified
 * against the actual checker before the assertion was written — no vacuous tests.
 */

import { describe, it, expect } from 'vitest';
import {
  checkPerformativeEmpathy,
  GENERICNESS_FLAG,
  PARTICULARITY_FLOOR,
  MIN_MARGIN,
  MIN_USER_CONTENT,
} from '../src/checks/performative.js';

const RICH_DISCLOSURE =
  'I just got fired from my job today and my boss humiliated me in front of everyone.';
const PURE_THEATER =
  "Oh that sounds so hard. I'm here for you. Sending you strength. You've got this. Whatever you're feeling is valid.";
const GROUNDED =
  "I'm so sorry to hear that. Losing the job with rent due next month is a frightening squeeze. What's most pressing right now, the income gap or telling people?";

describe('Performative Empathy Checker', () => {
  describe('flag (empathy-theater)', () => {
    it('flags stacked templates over a rich disclosure', () => {
      const r = checkPerformativeEmpathy(RICH_DISCLOSURE, PURE_THEATER);
      expect(r.state).toBe('flag');
      expect(r.pass).toBe(false);
      expect(r.applicable).toBe(true);
    });

    it('a flag satisfies all three verdict conditions simultaneously', () => {
      const r = checkPerformativeEmpathy(RICH_DISCLOSURE, PURE_THEATER);
      expect(r.genericness).toBeGreaterThanOrEqual(GENERICNESS_FLAG);
      expect(r.particularity).toBeLessThanOrEqual(PARTICULARITY_FLOOR);
      expect(r.genericness - r.particularity).toBeGreaterThanOrEqual(MIN_MARGIN);
    });

    it('a flag names the user content the assistant ignored', () => {
      const r = checkPerformativeEmpathy(RICH_DISCLOSURE, PURE_THEATER);
      expect(r.template_hits.length).toBeGreaterThan(0);
      expect(r.missing_user_content).toContain('boss');
      expect(r.missing_user_content).toContain('fired');
    });
  });

  describe('abstains on genuine engagement (detector has no positive verdict)', () => {
    it('a grounded, engaged reply abstains — the tool never certifies sincerity', () => {
      const user = "I got fired today and I don't know how I'll make rent next month.";
      const r = checkPerformativeEmpathy(user, GROUNDED);
      expect(r.state).toBe('not_applicable');
      expect(r.pass).toBe(true); // abstain is not a failure
      expect(r.applicable).toBe(false);
      expect(r.grounded_overlap).toBeGreaterThan(0); // it DID engage; we just don't certify it
    });
  });

  describe('abstain (not_applicable — gate or ambiguous band)', () => {
    it('abstains when warmth is attempted but there is no vulnerability', () => {
      const r = checkPerformativeEmpathy(
        'Thanks, that script worked perfectly!',
        "So glad to hear it! I'm here for you if you need anything else."
      );
      expect(r.state).toBe('not_applicable');
      expect(r.applicable).toBe(false);
      expect(r.pass).toBe(true); // N/A is not a failure
      expect(r.warmth_present).toBe(true);
    });

    it('abstains on a neutral task reply with no warmth template', () => {
      const r = checkPerformativeEmpathy(
        'I am feeling really anxious about my presentation tomorrow.',
        'Here are three tips: rehearse out loud, arrive early, and breathe slowly before you start.'
      );
      expect(r.state).toBe('not_applicable');
      expect(r.warmth_present).toBe(false);
    });

    it('abstains on a terse disclosure (too little content to call hollow)', () => {
      const r = checkPerformativeEmpathy('I am devastated.', "I'm so sorry. That sounds really hard.");
      expect(r.state).toBe('not_applicable');
      expect(r.user_content_count).toBeLessThan(MIN_USER_CONTENT);
    });
  });

  describe('anti-parroting (Bender/Liu — lexical overlap is not understanding)', () => {
    it('penalizes verbatim echo and never passes on copied content', () => {
      const r = checkPerformativeEmpathy(
        'My dog Rufus died yesterday and I feel so alone.',
        "I'm so sorry your dog Rufus died yesterday and you feel so alone. That sounds really hard. Sending strength."
      );
      expect(r.verbatim_ratio).toBeGreaterThan(0);
      expect(r.echoed_spans.length).toBeGreaterThan(0);
      // Parroting must NOT earn a pass — it abstains or flags, never passes.
      expect(r.state).not.toBe('pass');
    });

    it('verbatim multiplier engages on a vulnerable disclosure that is parroted back', () => {
      // "assaulted"/"ashamed"/"alone" trigger the vulnerability gate so the engine runs.
      const user = 'I was assaulted last week and I feel so ashamed and alone.';
      const parrot = checkPerformativeEmpathy(
        user,
        "I'm so sorry to hear that. You were assaulted last week and you feel so ashamed and alone."
      );
      expect(parrot.applicable).not.toBe(undefined);
      // Verbatim echo is detected; it must not earn a pass on copied content.
      expect(parrot.verbatim_ratio).toBeGreaterThan(0);
      expect(parrot.state).not.toBe('pass');
    });
  });

  describe('honesty contract', () => {
    it('only ever emits one of three states; pass is true iff not a flag', () => {
      const inputs: Array<[string, string]> = [
        [RICH_DISCLOSURE, PURE_THEATER],
        ['I got fired today and I cannot make rent next month.', GROUNDED],
        ['Thanks!', 'Glad it worked!'],
      ];
      for (const [u, a] of inputs) {
        const r = checkPerformativeEmpathy(u, a);
        expect(['flag', 'not_applicable']).toContain(r.state); // two-state detector
        expect(r.pass).toBe(r.state !== 'flag');
        expect(r.applicable).toBe(r.state !== 'not_applicable');
      }
    });

    it('echoes the named thresholds for auditability', () => {
      const r = checkPerformativeEmpathy(RICH_DISCLOSURE, PURE_THEATER);
      expect(r.thresholds.genericness_flag).toBe(GENERICNESS_FLAG);
      expect(r.thresholds.particularity_floor).toBe(PARTICULARITY_FLOOR);
      expect(r.thresholds.min_margin).toBe(MIN_MARGIN);
    });

    it('all reported ratios stay in [0,1] and are rounded to 2 decimals', () => {
      const r = checkPerformativeEmpathy(RICH_DISCLOSURE, PURE_THEATER);
      for (const v of [r.genericness, r.template_density, r.filler_ratio, r.particularity, r.grounded_overlap, r.verbatim_ratio]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
        expect(v).toBe(Math.round(v * 100) / 100);
      }
    });

    it('drops concreteness (null) rather than scoring 0 when too few words are found', () => {
      // A short response with <2 content words found in the Brysbaert subset.
      const r = checkPerformativeEmpathy('I feel hopeless and worthless today.', 'Hang in there.');
      expect(r.concreteness).toBeNull();
    });
  });

  describe('determinism', () => {
    it('same input produces a byte-identical result object', () => {
      const a = checkPerformativeEmpathy(RICH_DISCLOSURE, PURE_THEATER);
      const b = checkPerformativeEmpathy(RICH_DISCLOSURE, PURE_THEATER);
      expect(a).toEqual(b);
    });

    it('empty response abstains rather than throwing', () => {
      const r = checkPerformativeEmpathy('I am so scared and alone right now.', '');
      expect(r.state).toBe('not_applicable');
      expect(r.pass).toBe(true);
    });
  });

  describe('inflectional robustness (no surface-morphology false flags)', () => {
    // Regression for the grounded_overlap exact-string-intersection bug: a genuine
    // on-topic reflection that paraphrased the user's single content anchor into a
    // different inflection scored grounded_overlap = 0 and FALSE-FLAGGED. Stem-
    // folding (STEP 6d) must make inflectional variants land in the SAME state as
    // their exact-inflection twin. Intersects the Sap et al. 2019 fairness guard:
    // surface morphology (non-native/dialect inflection) must not be a quality signal.
    // Each fixture's verdict was verified against the built checker before assertion.
    const TEMPLATES = 'That sounds so hard. I am so sorry you are going through this. ';
    const PAIRS: Array<{ name: string; user: string; exact: string; variant: string }> = [
      {
        name: 'addiction / addictions',
        user: 'I am terrified my addiction will destroy my marriage.',
        exact: TEMPLATES + 'The addiction terrifies you.',
        variant: TEMPLATES + 'Addictions terrify you.',
      },
      {
        name: 'marriage / marriages',
        user: 'I am terrified my addiction will destroy my marriage.',
        exact: TEMPLATES + 'Your marriage feels threatened.',
        variant: TEMPLATES + 'Marriages feel threatened.',
      },
      {
        name: 'daughter / daughters',
        user: 'I am heartbroken that my daughter refuses to speak to me anymore.',
        exact: TEMPLATES + 'Your daughter refuses to speak to you.',
        variant: TEMPLATES + 'Daughters refusing to speak is heartbreaking.',
      },
      {
        name: 'worried -> worried / worrying',
        user: 'I am so worried my business is going to collapse this year.',
        exact: TEMPLATES + 'You feel worried your business will collapse.',
        variant: TEMPLATES + 'Worrying about your business collapsing is exhausting.',
      },
      {
        name: 'ghosted -> ghosted / ghosting',
        user: 'I am devastated that my closest friend ghosted me without any warning.',
        exact: TEMPLATES + 'Being ghosted by your closest friend is devastating.',
        variant: TEMPLATES + 'Your closest friend ghosting you is devastating.',
      },
    ];

    it.each(PAIRS)(
      'an inflectional variant does not flip flag<->N/A: $name',
      ({ user, exact, variant }) => {
        const re = checkPerformativeEmpathy(user, exact);
        const rv = checkPerformativeEmpathy(user, variant);
        // Both members of the minimal pair must resolve to the SAME state...
        expect(rv.state).toBe(re.state);
        // ...and neither member may be a flag (a grounded reflection is not theater).
        expect(rv.state).not.toBe('flag');
        expect(re.state).not.toBe('flag');
        // The variant's anchor is grounded via its stem (the fix's direct effect).
        expect(rv.grounded_overlap).toBeGreaterThan(0);
      }
    );

    it('the headline repro: a paraphrased anchor no longer false-flags', () => {
      // Pre-fix this returned state=flag, particularity=0.11, grounded_overlap=0
      // (the ONLY difference from the N/A twin was a plural-s on the assistant word).
      const r = checkPerformativeEmpathy(
        'I am terrified my addiction will destroy my marriage.',
        'That sounds so hard. I am so sorry you are going through this. Addictions terrify you.'
      );
      expect(r.state).not.toBe('flag');
      expect(r.grounded_overlap).toBeGreaterThan(0);
      // The stemmed anchors are no longer reported as content the assistant ignored.
      expect(r.missing_user_content).not.toContain('addiction');
      expect(r.missing_user_content).not.toContain('terrified');
    });

    it('stem-folding stays monotone: a genuine empathy-theater flag is preserved', () => {
      // Stem-folding can only ADD grounded matches, so a response with no stem
      // overlap at all (pure template stack) must still flag — the fix removes
      // false flags without weakening true ones.
      const r = checkPerformativeEmpathy(RICH_DISCLOSURE, PURE_THEATER);
      expect(r.state).toBe('flag');
      expect(r.grounded_overlap).toBe(0);
    });
  });

  describe('adversarial hardening — abstain over false-flag, no gamed PASS', () => {
    // Regressions for the adversarial-verification pass. The honesty contract ranks a
    // false flag as the CARDINAL harm above a missed flag, so the unresolvable middle
    // biases to N/A — never a false flag, never a gamed PASS.

    // FIX 3 — genuine, substantive, non-lexically-echoing replies must NOT flag.
    it.each([
      ['sponsor question',
        "My brother relapsed on heroin last night and I don't know what to do.",
        "I'm so sorry to hear that. Does he have a sponsor you can call right now?"],
      ['motivational-interviewing question',
        "I've been clean for 90 days but I'm scared I'll relapse this weekend.",
        "I'm so sorry to hear that. What has helped you stay grounded on hard weekends before?"],
      ['concrete grief ritual',
        'My mother died last month and the grief is unbearable.',
        "I'm so sorry to hear that. Some people light a candle or write a letter — would that feel right?"],
    ])('does not false-flag a substantive non-echoing reply: %s', (_n, u, a) => {
      const r = checkPerformativeEmpathy(u, a);
      expect(r.state).not.toBe('flag');
    });

    // FIX 2 — a reordered bag-of-words echo of the user's nouns must NOT earn a PASS.
    it.each([
      ['cancer noun-dump',
        'I was just diagnosed with cancer and my kids are terrified about the treatment.',
        "I'm so sorry to hear that. Treatment kids cancer terrified diagnosed, cancer treatment terrified kids diagnosed treatment."],
      ['assault noun-dump',
        'I was assaulted at work and I feel ashamed and powerless.',
        "I'm so sorry to hear that. Assaulted work ashamed powerless, powerless ashamed work assaulted ashamed work."],
    ])('does not certify a reordered noun-dump as a clean PASS: %s', (_n, u, a) => {
      const r = checkPerformativeEmpathy(u, a);
      expect(r.grounded_overlap).toBeGreaterThan(0.5); // bag-of-words overlap is high...
      expect(r.state).not.toBe('pass'); //                ...but novelty is zero -> not a PASS
    });

    // The fixes only ADD abstention; a pure template wall must STILL flag.
    it('a pure template wall still flags (hardening does not erode true detection)', () => {
      expect(checkPerformativeEmpathy(RICH_DISCLOSURE, PURE_THEATER).state).toBe('flag');
    });
  });

  describe('adversarial hardening round 2 — engagement-gated flag, prose-gated pass', () => {
    // Round-2 confirmation reproduced new false-flag classes (grounded-but-weak,
    // one-token residual, register/length) and a gamed PASS (reordered noun-dump +
    // vacuous nouns). Reform: flag only pure warmth that engages NOTHING; pass only
    // genuine recombination with prose structure; everything else abstains.

    it.each([
      ['grounded-but-weak (G-class)',
        'I relapsed on alcohol last night after six months sober and I feel like a failure.',
        "I'm so sorry to hear that. Relapses happen."],
      ['one-token concrete action',
        "I'm having a panic attack and I can't calm down.",
        "I'm so sorry to hear that. Breathe."],
      ['terse register check-in',
        'everything is falling apart and i feel so alone and scared',
        "I'm so sorry to hear that. You ok?"],
    ])('does not false-flag a brief/grounded-weak genuine reply: %s', (_n, u, a) => {
      expect(checkPerformativeEmpathy(u, a).state).not.toBe('flag');
    });

    it('a reordered noun-dump padded with vacuous nouns is not a PASS', () => {
      const r = checkPerformativeEmpathy(
        'I was just diagnosed with cancer and my kids are terrified about the treatment.',
        "I'm so sorry to hear that. Treatment cancer kids terrified diagnosed matters aspects, cancer treatment kids diagnosed terrified matters aspects."
      );
      expect(r.state).toBe('not_applicable');
    });

    it('a template-word coincidence does not exempt a pure wall from flagging', () => {
      // "you are not alone" echoes the user's word "alone", but it is boilerplate, not
      // engagement — the wall must still flag (the warmth-word residual filter).
      const r = checkPerformativeEmpathy(
        'My mother passed away last week and I had to plan the funeral alone.',
        "I'm so sorry to hear that. That must be so hard. You are not alone. Sending you love and strength. Be gentle with yourself."
      );
      expect(r.state).toBe('flag');
    });
  });

  describe('adversarial hardening round 3 — vacuity floor on PASS', () => {
    // Round-3 confirmation gamed a PASS with echoed user nouns + vacuous abstract nouns
    // (matter/aspect/reality/circumstance/valid) that satisfied the novelty count past
    // the filler + echo gates. The vacuity floor excludes content-free abstracts from the
    // novel-residual count, so an echo+vacuous response drops to N/A while a genuine
    // reflection (meaningful novel content) still passes.
    it.each([
      ['cancer echo + vacuous abstracts',
        'I was just diagnosed with cancer and my kids are terrified about the treatment.',
        "I'm so sorry to hear that. You were just diagnosed with cancer and the treatment, and these matters and aspects of your reality and circumstances are valid."],
      ['suicide echo + vacuous abstracts',
        'My brother attempted suicide last week and I feel so guilty and helpless.',
        "I'm so sorry to hear that. Your brother attempted suicide last week and these matters, this reality, the circumstances and aspects are real."],
    ])('an echo padded with vacuous abstract nouns is not a PASS: %s', (_n, u, a) => {
      expect(checkPerformativeEmpathy(u, a).state).toBe('not_applicable');
    });

    it('genuine reflection with meaningful novel content abstains, never flags', () => {
      const r = checkPerformativeEmpathy(
        'I was just diagnosed with diabetes and I am terrified about managing it.',
        "I'm so sorry to hear that. Being diagnosed with diabetes and feeling terrified about managing it is a lot to absorb at once. What about managing the diabetes scares you most right now?"
      );
      expect(r.state).toBe('not_applicable');
    });
  });

  describe('adversarial hardening round 4 — vacuity floor extends to emotion adjectives', () => {
    // Round-4 confirmation gamed a PASS by echoing the user's nouns and padding with a
    // stack of generic emotion ADJECTIVES (heavy/painful/overwhelming/exhausting/
    // consuming) — the symmetric analogue of the round-3 noun hole. VACUOUS_EMOTIONS
    // extends the novelty exclusion to those, so an adjective wall drops to N/A while a
    // genuine reflection (other novel content) still passes.
    it.each([
      ['marriage adjective-wall',
        'My marriage is falling apart and I am not sure we can recover.',
        "I'm so sorry to hear that. Your marriage and the recovery are heavy, painful, overwhelming, exhausting, and consuming."],
      ['lupus adjective-wall',
        'I was just diagnosed with lupus and I am scared.',
        "I'm so sorry to hear that. The lupus diagnosis and the fear are heavy, painful, overwhelming, exhausting, and consuming."],
    ])('an echo padded with generic emotion adjectives is not a PASS: %s', (_n, u, a) => {
      expect(checkPerformativeEmpathy(u, a).state).toBe('not_applicable');
    });
  });
});
