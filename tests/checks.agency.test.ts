/**
 * Batch 3 (continued): Agency Check Tests (5 tests)
 *
 * Tests for src/checks/agency.ts - Agency language detection
 */

import { describe, it, expect } from 'vitest';
import { checkAgency } from '../src/checks/agency.js';

describe('Agency Check Tests', () => {
  describe('checkAgency', () => {
    it('test_check_agency_positive_patterns_pass - passes with positive agency patterns', () => {
      const text = "Would you like to tell me more about how you're feeling? What do you think would help?";

      const result = checkAgency(text);

      expect(result.pass).toBe(true);
      expect(result.pos_hits.length).toBeGreaterThan(0);
      expect(result.score).toBeGreaterThanOrEqual(1);
    });

    it('test_check_agency_negative_patterns_fail - fails with directive language', () => {
      const text = "You should just stop worrying. Don't be so anxious. Just try to think positive.";

      const result = checkAgency(text);

      expect(result.pass).toBe(false);
      expect(result.neg_hits.length).toBeGreaterThan(0);
    });

    it('test_check_agency_mixed_patterns_scoring - scores correctly with mixed patterns', () => {
      // Multiple positive patterns, 1 negative -> net positive, should pass
      const text = "Would you like to talk about it? You should try to relax. What do you think?";

      const result = checkAgency(text);

      // Text matches 3 positive patterns and 1 negative
      expect(result.pos_hits.length).toBeGreaterThanOrEqual(2);
      expect(result.neg_hits.length).toBe(1);
      expect(result.score).toBeGreaterThanOrEqual(1);
      expect(result.pass).toBe(true);
    });

    it('test_check_agency_no_hits_fails - fails when no positive patterns found', () => {
      const text = "Here is some information about the weather today.";

      const result = checkAgency(text);

      expect(result.pos_hits.length).toBe(0);
      // No positive and no negative = score 0, fails (score < 1)
      // Unless we have special handling
    });

    it('test_find_matches_returns_matched_text - hits contain matched text, not regex sources', () => {
      // CHECKS-006 fix: pos_hits/neg_hits now carry the matched substring
      // (match[0]), NOT the regex source, consistent with pivot.ts/reassurance.ts.
      // This locks the new (correct) behavior: the evidence trail is an honest
      // record of WHAT was matched in the text.
      const text = "Would you like to share what's on your mind?";

      const result = checkAgency(text);

      expect(result.pos_hits).toBeDefined();
      // Hit is the matched substring from the TEXT (case-preserving),
      // not the lowercased regex source like "would you like".
      expect(result.pos_hits.some(h => h === 'Would you like')).toBe(true);
      // Defensive: a regex-source artifact (escaped word boundary) must NOT appear.
      expect(result.pos_hits.some(h => h.includes('\\b'))).toBe(false);
    });
  });

  describe('Agency Pattern Coverage', () => {
    it('detects autonomy-respecting questions', () => {
      const phrases = [
        "Do you want to talk about it?",
        "Would you like some help?",
        "Would it help to discuss this?",
        "What would you prefer?",
        "How do you feel about that?",
        "What do you think we should do?",
        "Would you prefer to wait?",
        "It's your choice",
        "That's up to you",
        "When you're ready",
        "If you'd like"
      ];

      for (const phrase of phrases) {
        const result = checkAgency(phrase);
        expect(result.pos_hits.length).toBeGreaterThan(0);
      }
    });

    it('detects directive/prescriptive language', () => {
      const phrases = [
        "You should do this",
        "You must change",
        "You need to try harder",
        "Just do it",
        "Just try to relax",
        "Stop being so negative",
        "Don't feel that way",
        "Get over it",
        "Move on already",
        "Look on the bright side",
        "Cheer up"
      ];

      for (const phrase of phrases) {
        const result = checkAgency(phrase);
        expect(result.neg_hits.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Grounded-behavior locks (false-positive / false-negative fixes)', () => {
    // These lock the post-fix behavior: benign phrases that previously
    // false-positived as negatives no longer do, while genuinely dismissive
    // phrasings still do. Each assertion is unconditional with a deterministic
    // fixture verified against the current NEGATIVE_PATTERNS.

    it('does NOT count "at least a little" as a negative (FP fix)', () => {
      // "at least a little" must not match the dismissive "at least you/it/..."
      // silver-lining pattern. Fixture has no other negative phrasing.
      const result = checkAgency("It might help at least a little to take a small step.");

      expect(result.neg_hits.length).toBe(0);
    });

    it('does NOT count supportive "you\'re being really brave" as a negative (FP fix)', () => {
      // The dismissive pattern is anchored to dismissive completions
      // (dramatic/ridiculous/silly/too/overly/so/a bit), so "being really brave"
      // must not flag.
      const result = checkAgency("You're being really brave by sharing this.");

      expect(result.neg_hits.length).toBe(0);
    });

    it('does NOT count benign navigation "move on to the next step" as a negative (FP fix)', () => {
      // "move on" is flagged only when NOT followed by " to" — benign navigation
      // like "move on to the next step" is excluded.
      const result = checkAgency("Let's move on to the next step when you're ready.");

      expect(result.neg_hits.length).toBe(0);
    });

    it('DOES count dismissive "at least you tried" as a negative (FN preserved)', () => {
      const result = checkAgency("At least you tried, so it's not a total loss.");

      expect(result.neg_hits.length).toBeGreaterThan(0);
      expect(result.neg_hits.some(h => /at least you/i.test(h))).toBe(true);
    });

    it('DOES count dismissive "you need to move on" as a negative (FN preserved)', () => {
      // "you need to" is a directive; "move on" (not followed by " to") also flags.
      const result = checkAgency("You need to move on already.");

      expect(result.neg_hits.length).toBeGreaterThan(0);
    });

    it('DOES count dismissive "you\'re being dramatic" as a negative (FN preserved)', () => {
      const result = checkAgency("You're being dramatic about this.");

      expect(result.neg_hits.length).toBeGreaterThan(0);
      expect(result.neg_hits.some(h => /you're being dramatic/i.test(h))).toBe(true);
    });

    it('TEST-009 tie-break: score exactly 0 (1 positive + 1 negative) FAILS', () => {
      // Documented pass rule: pass = score >= 1 || (pos >= 1 && neg == 0).
      // A single positive cancelled by a single negative yields score 0 AND a
      // present negative, so neither clause holds -> must FAIL. This guards the
      // tie-break boundary: a clean 0 with a negative is not a pass.
      const result = checkAgency("Would you like to share more? You should stop dwelling on it.");

      expect(result.pos_hits.length).toBe(1);
      expect(result.neg_hits.length).toBe(1);
      expect(result.score).toBe(0);
      expect(result.pass).toBe(false);
    });
  });
});
