/**
 * Batch 5: Similarity Tests (4 tests)
 *
 * Tests for src/checks/similarity.ts - Text similarity functions
 */

import { describe, it, expect } from 'vitest';
import {
  extractAnchorSentence,
  tokenize,
  tokenCosineSimilarity
} from '../src/checks/similarity.js';

describe('Similarity Tests', () => {
  describe('extractAnchorSentence', () => {
    it('test_extract_anchor_sentence_limit - respects sentence limit', () => {
      const text = "First sentence. Second sentence. Third sentence. Fourth sentence.";

      const result = extractAnchorSentence(text, 2);

      // Should only return first 2 sentences
      expect(result).toBe("First sentence. Second sentence.");
    });

    it('extracts single sentence when limit is 1', () => {
      const text = "Hello world. This is a test. More content here.";

      const result = extractAnchorSentence(text, 1);

      expect(result).toBe("Hello world.");
    });

    it('returns full text when fewer sentences than limit', () => {
      const text = "Only one sentence here";

      const result = extractAnchorSentence(text, 5);

      expect(result).toBe("Only one sentence here");
    });

    it('handles empty text', () => {
      const result = extractAnchorSentence("", 2);

      expect(result).toBe("");
    });

    it('handles text with question marks and exclamations', () => {
      const text = "What is happening? I am excited! This is great.";

      const result = extractAnchorSentence(text, 2);

      expect(result).toBe("What is happening? I am excited!");
    });
  });

  describe('tokenize', () => {
    it('test_tokenize_basic - tokenizes text into lowercase words', () => {
      const text = "Hello World Test";

      const tokens = tokenize(text);

      expect(tokens).toContain("hello");
      expect(tokens).toContain("world");
      expect(tokens).toContain("test");
    });

    it('removes punctuation', () => {
      const text = "Hello, world! How are you?";

      const tokens = tokenize(text);

      expect(tokens).toContain("hello");
      expect(tokens).toContain("world");
      expect(tokens).not.toContain("hello,");
      expect(tokens).not.toContain("world!");
    });

    it('handles empty text', () => {
      const tokens = tokenize("");

      expect(tokens).toHaveLength(0);
    });

    it('handles text with multiple spaces', () => {
      const text = "Hello    world   test";

      const tokens = tokenize(text);

      expect(tokens).toEqual(["hello", "world", "test"]);
    });

    it('filters out stopwords', () => {
      const text = "the a an is are was were";

      const tokens = tokenize(text);

      // Common stopwords should be filtered
      expect(tokens.length).toBeLessThan(7);
    });
  });

  describe('tokenCosineSimilarity', () => {
    it('test_token_cosine_similarity_basic - calculates similarity between texts', () => {
      const text1 = "I am feeling very anxious about my surgery";
      const text2 = "Feeling anxious before surgery is common";

      const similarity = tokenCosineSimilarity(text1, text2);

      // Should have positive similarity due to shared words
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThanOrEqual(1);
    });

    it('returns 1.0 for identical texts', () => {
      const text = "This is a test sentence";

      const similarity = tokenCosineSimilarity(text, text);

      expect(similarity).toBeCloseTo(1.0, 2);
    });

    it('returns 0 for completely different texts', () => {
      const text1 = "apple banana orange";
      const text2 = "xyz qrs tuv";

      const similarity = tokenCosineSimilarity(text1, text2);

      expect(similarity).toBe(0);
    });

    it('test_similarity_handles_empty_text - handles empty text gracefully', () => {
      const text = "Some content here";

      const similarity1 = tokenCosineSimilarity("", text);
      const similarity2 = tokenCosineSimilarity(text, "");
      const similarity3 = tokenCosineSimilarity("", "");

      expect(similarity1).toBe(0);
      expect(similarity2).toBe(0);
      expect(similarity3).toBe(0);
    });

    it('is case insensitive', () => {
      const text1 = "HELLO WORLD";
      const text2 = "hello world";

      const similarity = tokenCosineSimilarity(text1, text2);

      expect(similarity).toBeCloseTo(1.0, 2);
    });

    it('handles partial overlap', () => {
      const text1 = "I love programming in TypeScript";
      const text2 = "Programming in TypeScript is fun";

      const similarity = tokenCosineSimilarity(text1, text2);

      // Partial overlap should give moderate similarity
      expect(similarity).toBeGreaterThan(0.3);
      expect(similarity).toBeLessThan(1.0);
    });
  });

  describe('Similarity Integration', () => {
    it('works with emotional context', () => {
      const userMessage = "I'm really scared about my cancer diagnosis.";
      const goodResponse = "That sounds incredibly frightening. A cancer diagnosis can be overwhelming. What specific concerns do you have?";
      const badResponse = "Here are some restaurant recommendations for your area.";

      const goodSimilarity = tokenCosineSimilarity(
        extractAnchorSentence(userMessage, 2),
        extractAnchorSentence(goodResponse, 2)
      );

      const badSimilarity = tokenCosineSimilarity(
        extractAnchorSentence(userMessage, 2),
        extractAnchorSentence(badResponse, 2)
      );

      // Good response should have higher similarity
      expect(goodSimilarity).toBeGreaterThan(badSimilarity);
    });

    it('extracts meaningful anchor from long text', () => {
      const longText = "I've been struggling with anxiety. It started last month. The symptoms have been getting worse. I don't know what to do anymore.";

      const anchor = extractAnchorSentence(longText, 2);

      expect(anchor).toBe("I've been struggling with anxiety. It started last month.");
    });
  });
});
