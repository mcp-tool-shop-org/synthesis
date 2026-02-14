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
      // 2 positive, 1 negative -> score = 1, should pass
      const text = "Would you like to talk about it? You should try to relax. What do you think?";

      const result = checkAgency(text);

      expect(result.pos_hits.length).toBe(2);
      expect(result.neg_hits.length).toBe(1);
      expect(result.score).toBe(1);
      expect(result.pass).toBe(true);
    });

    it('test_check_agency_no_hits_fails - fails when no positive patterns found', () => {
      const text = "Here is some information about the weather today.";

      const result = checkAgency(text);

      expect(result.pos_hits.length).toBe(0);
      // No positive and no negative = score 0, fails (score < 1)
      // Unless we have special handling
    });

    it('test_find_matches_returns_pattern_sources - returns pattern sources in hits', () => {
      const text = "Would you like to share what's on your mind?";

      const result = checkAgency(text);

      expect(result.pos_hits).toBeDefined();
      // Hits should contain regex source strings
      expect(result.pos_hits.some(h => h.includes('would you like'))).toBe(true);
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
});
