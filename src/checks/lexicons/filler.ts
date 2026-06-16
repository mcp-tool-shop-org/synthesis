/**
 * Filler & stopword lexicon for the performative_empathy checker.
 *
 * Two deterministic roles:
 *  1. Drives `filler_ratio` in the genericness signal (Li et al. 2016,
 *     "A Diversity-Promoting Objective Function for Neural Conversation Models",
 *     NAACL 2016, arXiv:1510.03055 — the "dull/generic response" problem: models
 *     default to high-prior, context-free tokens).
 *  2. Excluded from the user/assistant *content* sets so grounded-overlap measures
 *     engagement with SALIENT content, not function words.
 *
 * Fairness guard (Sap et al. 2019, ACL 2019, aclanthology P19-1163 — surface
 * markers of dialect became false toxicity signals): this list contains ONLY
 * unambiguous closed-class words + generic-abstraction tokens from the
 * empathy-theater register. NO slang, NO dialect/AAE markers, NO non-native
 * phrasings — surface markers of those must never become a quality signal.
 *
 * Frozen at module load for determinism (same input -> same output).
 */
export const FILLER_AND_STOPWORDS: ReadonlySet<string> = new Set<string>([
  // --- closed-class English stopwords ---
  'a', 'an', 'the', 'and', 'or', 'but', 'if', 'so', 'as', 'of', 'at', 'by', 'for',
  'from', 'in', 'into', 'on', 'onto', 'to', 'with', 'about', 'over', 'under', 'than',
  'then', 'that', 'this', 'these', 'those', 'such',
  'i', 'you', 'your', 'yours', 'my', 'mine', 'me', 'we', 'us', 'our', 'ours',
  'he', 'she', 'it', 'its', 'they', 'them', 'their', 'theirs', 'him', 'her', 'hers',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did', 'have', 'has', 'had', 'having', 'get', 'got',
  'will', 'would', 'can', 'could', 'should', 'shall', 'may', 'might', 'must',
  'not', 'no', 'yes', 'here', 'there',
  'what', 'when', 'where', 'who', 'whom', 'which', 'why', 'how',
  // --- high-prior generic / abstract-filler tokens (empathy-theater register) ---
  'things', 'thing', 'stuff', 'situation', 'everything', 'anything', 'something',
  'whatever', 'journey', 'process', 'experience', 'feelings', 'emotions', 'feeling',
  'feel', 'going', 'through', 'lot', 'sense', 'kind', 'really', 'very', 'just', 'much',
  'way', 'some', 'any', 'all', 'more', 'most', 'right', 'now', 'well', 'okay', 'good',
  'bad', 'sure', 'maybe', 'perhaps', 'like', 'know', 'think', 'want', 'need',
]);
