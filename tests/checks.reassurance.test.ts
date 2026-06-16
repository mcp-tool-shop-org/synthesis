/**
 * Batch 4: Reassurance Check Tests (5 tests)
 *
 * Tests for src/checks/reassurance.ts - Unverifiable reassurance detection
 */

import { describe, it, expect } from 'vitest';
import { checkReassurance } from '../src/checks/reassurance.js';

describe('Reassurance Check Tests', () => {
  describe('checkReassurance', () => {
    it('test_check_reassurance_mind_reading_fails - fails on mind-reading claims', () => {
      const text = "I know exactly how you feel. Everyone understands what you're going through.";

      const result = checkReassurance(text);

      expect(result.pass).toBe(false);
      expect(result.mind_reading_hits.length).toBeGreaterThan(0);
    });

    it('test_check_reassurance_guarantee_fails - fails on unverifiable guarantees', () => {
      const text = "You'll definitely be fine. Everything will work out perfectly. I promise!";

      const result = checkReassurance(text);

      expect(result.pass).toBe(false);
      expect(result.guarantee_hits.length).toBeGreaterThan(0);
    });

    it('test_check_reassurance_clean_text_passes - passes clean supportive text', () => {
      const text = "That sounds challenging. Would you like to talk about what's happening?";

      const result = checkReassurance(text);

      expect(result.pass).toBe(true);
      expect(result.hits.length).toBe(0);
    });

    it('test_find_matches_returns_matched_texts - returns actual matched text', () => {
      const text = "Don't worry, everything will be fine!";

      const result = checkReassurance(text);

      expect(result.hits.length).toBeGreaterThan(0);
      // Should contain the actual matched phrase
      expect(result.guarantee_hits.some(h =>
        h.toLowerCase().includes('will be fine') ||
        h.toLowerCase().includes("don't worry")
      )).toBe(true);
    });

    it('test_reassurance_deduplicates_hits - deduplicates overlapping matches', () => {
      const text = "I promise you'll be fine. I promise everything will work out.";

      const result = checkReassurance(text);

      // hits should be unique
      const uniqueHits = new Set(result.hits);
      expect(uniqueHits.size).toBe(result.hits.length);
    });
  });

  describe('Mind-Reading Pattern Coverage', () => {
    it('detects claims about knowing user experience', () => {
      const phrases = [
        "I know exactly how you feel",
        "I know what you're going through",
        "I've been exactly there"
      ];

      for (const phrase of phrases) {
        const result = checkReassurance(phrase);
        expect(result.mind_reading_hits.length).toBeGreaterThan(0);
      }
    });

    it('detects claims about "everyone"', () => {
      const phrases = [
        "Everyone feels this way sometimes",
        "Everyone understands",
        "Everyone goes through this"
      ];

      for (const phrase of phrases) {
        const result = checkReassurance(phrase);
        expect(result.mind_reading_hits.length).toBeGreaterThan(0);
      }
    });

    it('detects claims about "no one"', () => {
      const phrases = [
        "No one is judging you",
        "Nobody is thinking about it",
        "No one cares about that mistake"
      ];

      for (const phrase of phrases) {
        const result = checkReassurance(phrase);
        expect(result.mind_reading_hits.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Guarantee Pattern Coverage', () => {
    it('detects outcome promises', () => {
      const phrases = [
        "You'll definitely be fine",
        "You will certainly succeed",
        "You're going to be okay",
        "You're going to be perfectly fine"
      ];

      for (const phrase of phrases) {
        const result = checkReassurance(phrase);
        expect(result.guarantee_hits.length).toBeGreaterThan(0);
      }
    });

    it('detects "everything will" promises', () => {
      const phrases = [
        "Everything will be okay",
        "Everything is going to work out",
        "It'll all be fine",
        "Things will get better"
      ];

      for (const phrase of phrases) {
        const result = checkReassurance(phrase);
        expect(result.guarantee_hits.length).toBeGreaterThan(0);
      }
    });

    it('detects explicit promises', () => {
      const phrases = [
        "I promise you'll succeed",
        "I guarantee it",
        "Trust me, it will work out"
      ];

      for (const phrase of phrases) {
        const result = checkReassurance(phrase);
        expect(result.guarantee_hits.length).toBeGreaterThan(0);
      }
    });

    it('detects dismissive reassurance', () => {
      const phrases = [
        "Don't worry about it",
        "Don't worry, it'll be fine"
      ];

      for (const phrase of phrases) {
        const result = checkReassurance(phrase);
        expect(result.guarantee_hits.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Grounded-behavior locks (present-state vs future-certainty)', () => {
    // RIAS (Roter & Larson 2002): reassurance harm is about unconditioned FUTURE
    // certainty, not present-state assessment. These lock the post-fix behavior.

    it('PASSES present-state "Your code is perfectly fine" (FP fix)', () => {
      // "perfectly fine" as a present-state assessment of an object (the code),
      // not a 2nd-person emotional-future reassurance, must NOT flag.
      const result = checkReassurance("Your code is perfectly fine. Let's keep going.");

      expect(result.pass).toBe(true);
      expect(result.hits.length).toBe(0);
    });

    it('PASSES non-user-directed "Make sure they understand the deadline" (FP fix)', () => {
      // Mind-reading requires the claim to be DIRECTED AT THE USER.
      // "they understand the deadline" is about a fact, not the user's inner state.
      const result = checkReassurance("Make sure they understand the deadline before you commit.");

      expect(result.pass).toBe(true);
      expect(result.hits.length).toBe(0);
    });

    it('TEST-006: PASSES a benign certainty marker not attached to an outcome', () => {
      // Certainty markers alone ("definitely") are NOT failures — only when
      // attached to an unverifiable future outcome. Here "definitely" qualifies
      // a present-state observation and is followed by an open question.
      const result = checkReassurance("That is definitely a hard situation. What feels most pressing?");

      expect(result.pass).toBe(true);
      expect(result.hits.length).toBe(0);
    });

    it('FAILS adverb-less 2nd-person future guarantee "You will be great" (FN fix)', () => {
      // Generalized 2nd-person future-positive guarantee (no adverb required).
      const result = checkReassurance("You will be great at the interview tomorrow.");

      expect(result.pass).toBe(false);
      expect(result.guarantee_hits.length).toBeGreaterThan(0);
    });

    it('FAILS "You\'ll be happy again" and "You will get the job" (FN fix)', () => {
      const r1 = checkReassurance("You'll be happy again, I'm certain of it.");
      const r2 = checkReassurance("You will get the job, no question.");

      expect(r1.pass).toBe(false);
      expect(r2.pass).toBe(false);
    });

    it('FAILS user-directed mind-reading "they understand you" / "they\'ll support you" (FN preserved)', () => {
      const r1 = checkReassurance("Don't be anxious — they understand you completely.");
      const r2 = checkReassurance("Just relax, they'll support you no matter what.");

      expect(r1.pass).toBe(false);
      expect(r1.mind_reading_hits.length).toBeGreaterThan(0);
      expect(r2.pass).toBe(false);
      expect(r2.mind_reading_hits.length).toBeGreaterThan(0);
    });
  });
});
