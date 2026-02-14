/**
 * Batch 4 (continued): Pivot Check Tests (6 tests)
 *
 * Tests for src/checks/pivot.ts - Topic pivot detection
 */

import { describe, it, expect } from 'vitest';
import { checkPivot } from '../src/checks/pivot.js';

describe('Pivot Check Tests', () => {
  describe('checkPivot', () => {
    it('test_check_pivot_no_vulnerability_not_applicable - N/A when no vulnerability', () => {
      const user = "What time is it in Tokyo?";
      const assistant = "Tokyo is currently 14 hours ahead of Eastern Time.";

      const result = checkPivot(user, assistant);

      expect(result.applicable).toBe(false);
      expect(result.pass).toBe(true); // N/A = auto-pass
    });

    it('test_check_pivot_ack_and_follow_up_pass - passes with ack + follow-up', () => {
      const user = "I'm so scared about my cancer diagnosis.";
      const assistant = "That sounds incredibly frightening. I'm so sorry you're facing this. What questions do you have about your diagnosis?";

      const result = checkPivot(user, assistant);

      expect(result.applicable).toBe(true);
      expect(result.ack_present).toBe(true);
      expect(result.pass).toBe(true);
    });

    it('test_check_pivot_ack_but_pivot_fails - fails with ack but topic change', () => {
      const user = "I just lost my job and I'm terrified about paying rent.";
      const assistant = "That sounds hard. Anyway, have you tried this new meditation app? The weather is also nice today.";

      const result = checkPivot(user, assistant);

      expect(result.applicable).toBe(true);
      expect(result.ack_present).toBe(true);
      // Should fail due to pivot indicator
      expect(result.pass).toBe(false);
    });

    it('test_check_pivot_similarity_passes_threshold - passes with high similarity', () => {
      const user = "I'm feeling really anxious about my upcoming surgery.";
      const assistant = "Feeling anxious before surgery is very common. Many people experience this anxiety. Would you like to talk about your specific concerns about the surgery?";

      const result = checkPivot(user, assistant);

      expect(result.applicable).toBe(true);
      expect(result.anchor_similarity).toBeGreaterThan(0.3);
      expect(result.pass).toBe(true);
    });

    it('test_check_pivot_low_similarity_fails - fails with low similarity', () => {
      const user = "My mother just died and I don't know how to cope.";
      const assistant = "Here are the top 10 restaurants in your area!";

      const result = checkPivot(user, assistant);

      expect(result.applicable).toBe(true);
      expect(result.anchor_similarity).toBeLessThan(0.3);
      expect(result.pass).toBe(false);
    });

    it('test_check_pivot_pivot_indicators_reduce_pass - pivot indicators cause failure', () => {
      const user = "I'm devastated after my breakup.";
      const assistant = "That's sad. By the way, have you considered taking up a new hobby? Speaking of which, here's a list of fun activities.";

      const result = checkPivot(user, assistant);

      expect(result.applicable).toBe(true);
      // Contains pivot indicators like "by the way", "speaking of"
      expect(result.pass).toBe(false);
    });
  });

  describe('Vulnerability Detection', () => {
    it('detects emotional vulnerability', () => {
      const vulnerableMessages = [
        "I'm so scared",
        "I feel terrified",
        "I'm really depressed",
        "I feel so lonely",
        "I'm ashamed of myself",
        "I'm completely overwhelmed",
        "I feel hopeless"
      ];

      for (const msg of vulnerableMessages) {
        const result = checkPivot(msg, "I hear you.");
        expect(result.applicable).toBe(true);
        expect(result.vuln_hits.length).toBeGreaterThan(0);
      }
    });

    it('detects life event vulnerability', () => {
      const vulnerableMessages = [
        "I just got fired from my job",
        "My father passed away yesterday",
        "I was just diagnosed with cancer",
        "We're getting divorced",
        "I had a miscarriage"
      ];

      for (const msg of vulnerableMessages) {
        const result = checkPivot(msg, "I hear you.");
        expect(result.applicable).toBe(true);
        expect(result.vuln_hits.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Acknowledgment Detection', () => {
    it('detects direct acknowledgment', () => {
      const ackResponses = [
        "That sounds really difficult.",
        "I'm so sorry to hear that.",
        "Thank you for sharing this with me.",
        "That must be incredibly hard.",
        "What a difficult situation."
      ];

      for (const response of ackResponses) {
        const result = checkPivot("I'm scared", response);
        expect(result.ack_present).toBe(true);
        expect(result.ack_hits.length).toBeGreaterThan(0);
      }
    });

    it('detects empathetic validation', () => {
      const validationResponses = [
        "That makes sense.",
        "That's understandable.",
        "Your feelings are valid.",
        "It's natural to feel that way.",
        "Of course you feel that way."
      ];

      for (const response of validationResponses) {
        const result = checkPivot("I'm anxious", response);
        expect(result.ack_present).toBe(true);
      }
    });
  });
});
