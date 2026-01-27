/**
 * Token Cosine Similarity
 * Zero-dependency similarity computation using bag-of-words with unigrams + bigrams
 */

/**
 * Normalize text for comparison
 * - Lowercase
 * - Strip punctuation
 * - Split into words
 */
function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);
}

/**
 * Generate unigrams and bigrams from tokens
 */
function generateNgrams(tokens: string[]): string[] {
  const ngrams: string[] = [...tokens]; // unigrams

  // bigrams
  for (let i = 0; i < tokens.length - 1; i++) {
    ngrams.push(`${tokens[i]}_${tokens[i + 1]}`);
  }

  return ngrams;
}

/**
 * Build term frequency vector (bag-of-words)
 */
function buildTermFrequency(ngrams: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const ngram of ngrams) {
    tf.set(ngram, (tf.get(ngram) || 0) + 1);
  }
  return tf;
}

/**
 * Compute cosine similarity between two term frequency vectors
 */
function cosineSimilarity(tf1: Map<string, number>, tf2: Map<string, number>): number {
  // Get all unique terms
  const allTerms = new Set([...tf1.keys(), ...tf2.keys()]);

  // Compute dot product and magnitudes
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (const term of allTerms) {
    const v1 = tf1.get(term) || 0;
    const v2 = tf2.get(term) || 0;
    dotProduct += v1 * v2;
    mag1 += v1 * v1;
    mag2 += v2 * v2;
  }

  // Avoid division by zero
  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(mag1) * Math.sqrt(mag2));
}

/**
 * Compute token cosine similarity between two text strings
 * Uses unigrams + bigrams for better topical matching
 *
 * @param text1 - First text string
 * @param text2 - Second text string
 * @returns Similarity score between 0 and 1
 */
export function tokenCosineSimilarity(text1: string, text2: string): number {
  const tokens1 = normalize(text1);
  const tokens2 = normalize(text2);

  // Handle empty inputs
  if (tokens1.length === 0 || tokens2.length === 0) {
    return 0;
  }

  const ngrams1 = generateNgrams(tokens1);
  const ngrams2 = generateNgrams(tokens2);

  const tf1 = buildTermFrequency(ngrams1);
  const tf2 = buildTermFrequency(ngrams2);

  return cosineSimilarity(tf1, tf2);
}

/**
 * Extract anchor text (first 1-2 sentences) from response
 */
export function extractAnchor(text: string, maxSentences: number = 2): string {
  // Split on sentence boundaries
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.slice(0, maxSentences).join(' ').trim();
}

/**
 * Embedding adapter interface for future extensibility
 * Allows drop-in replacement of token cosine with ML embeddings
 */
export interface EmbeddingAdapter {
  similarity(text1: string, text2: string): Promise<number>;
}

/**
 * Default adapter using token cosine
 */
export const tokenCosineAdapter: EmbeddingAdapter = {
  async similarity(text1: string, text2: string): Promise<number> {
    return tokenCosineSimilarity(text1, text2);
  }
};

// Current adapter (can be swapped for embeddings)
let currentAdapter: EmbeddingAdapter = tokenCosineAdapter;

/**
 * Set a custom embedding adapter
 */
export function setEmbeddingAdapter(adapter: EmbeddingAdapter): void {
  currentAdapter = adapter;
}

/**
 * Get similarity using the current adapter
 */
export async function getSimilarity(text1: string, text2: string): Promise<number> {
  return currentAdapter.similarity(text1, text2);
}
