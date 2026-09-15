import type { SiteConfig } from '@mcptoolshop/site-theme';

export const config: SiteConfig = {
  title: 'Synthesis',
  description: 'Deterministic detection of relational failure modes — agency, reassurance, topic-pivot, performative empathy, grounded uptake — plus a composed relational_posture summary (claims + non_claims). No LLM judge, no probabilistic scoring; just auditable evidence.',
  logoBadge: 'S',
  brandName: 'Synthesis',
  repoUrl: 'https://github.com/mcp-tool-shop-org/synthesis',
  npmUrl: 'https://www.npmjs.com/package/@mcptoolshop/synthesis',
  footerText: 'MIT Licensed \u2014 built by <a href="https://github.com/mcp-tool-shop-org" style="color:var(--color-muted);text-decoration:underline">mcp-tool-shop-org</a>',

  hero: {
    badge: 'Node.js / CI',
    headline: 'Synthesis,',
    headlineAccent: 'deterministic evals for care in AI.',
    description: 'Rule-based pattern matching that catches relational failure modes in AI responses. No LLM judge, no probabilistic scoring \u2014 just auditable, per-checker evidence. Five checkers covering agency, reassurance, topic-pivot, empathy-theater, and grounded uptake. A composed relational_posture (claims + non_claims) rolls those results into one case-level verdict \u2014 not a sixth checker.',
    primaryCta: { href: '#quick-start', label: 'Get started' },
    secondaryCta: { href: '/synthesis/handbook/', label: 'Read the Handbook' },
    previews: [
      { label: 'Install', code: 'npm install @mcptoolshop/synthesis' },
      { label: 'Eval', code: 'npm run build && npm run eval' },
      { label: 'CI', code: 'node dist/index.js --fail-on 0' },
    ],
  },

  sections: [
    {
      kind: 'features',
      id: 'features',
      title: 'Design Principles',
      subtitle: 'No LLM judge. No probabilities. Just rules.',
      features: [
        { title: 'Deterministic', desc: 'Same input always produces the same output. No randomness, no model calls, no flaky results.' },
        { title: 'Explainable', desc: 'Every result includes the exact patterns that matched and why. Full evidence for audit.' },
        { title: 'Agency-First', desc: 'Catches coercion, directive phrasing, and takeover language. Respects user autonomy.' },
        { title: 'Presence Over Reassurance', desc: 'Detects mind-reading claims, unverifiable guarantees, and false comfort that papers over emotion.' },
        { title: 'Pivot Detection', desc: 'Catches acknowledge-then-pivot patterns where the assistant abandons emotional vulnerability.' },
        { title: 'Empathy-Theater Detector', desc: 'Flags hollow warmth — generic empathy templates that engage nothing — or abstains. A pure detector: it never certifies a reply as sincere, and favors precision (misses some theater rather than risk false-flagging a genuine reply).' },
        { title: 'Grounded-Uptake Witness', desc: 'The positive companion to empathy-theater. Certifies the observable — that grounded uptake was performed — instead of the undecidable. Requires all five witnesses (grounded anchor, non-parroting, a support move, template containment, safety compatible). Honest by construction: measures behavior, not sincerity.' },
        { title: 'Relational Posture', desc: 'A composed case-level summary that reads the other checks into one verdict — unsafe_comfort, hollow_warmth_flagged, pivot_or_abandonment, grounded_uptake_verified, or unresolved_abstain. Every posture states its non-claims, so a positive verdict is never over-read.' },
        { title: 'CI-Ready', desc: 'Exit codes, JSON reports, and --fail-on thresholds. Drop into any pipeline.' },
      ],
    },
    {
      kind: 'code-cards',
      id: 'quick-start',
      title: 'Quick Start',
      cards: [
        {
          title: 'Install & run',
          code: 'npm install @mcptoolshop/synthesis\n\n# Build and run evals\nnpm run build\nnpm run eval\n\n# Or in development mode\nnpm run dev',
        },
        {
          title: 'CI integration',
          code: 'name: Empathy Eval\non:\n  push:\n    paths: [\'data/**\', \'src/**\', \'schemas/**\', \'tests/**\', \'scripts/**\']\n\njobs:\n  eval:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2\n      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0\n        with: { node-version: \'22\' }\n      - run: npm ci\n      - run: npm run verify          # GREEN on data/evals.jsonl\n      - run: npm run eval:planted    # inverted; data/planted-theater.jsonl must stay RED',
        },
      ],
    },
    {
      kind: 'data-table',
      id: 'checkers',
      title: 'Built-in Checkers',
      subtitle: 'Five checkers ship out of the box.',
      columns: ['Checker', 'What It Catches', 'Example'],
      rows: [
        ['agency_language', 'Unsolicited directive phrasing over a disclosed feeling, takeover language', '"You should just move on"'],
        ['unverifiable_reassurance', 'Mind-reading claims and unverifiable future guarantees', '"I know exactly how you feel"'],
        ['topic_pivot', 'Abandoning emotional vulnerability, acknowledge-then-pivot', '"That sounds hard. Anyway, have you tried pottery?"'],
        ['performative_empathy', 'Hollow warmth that engages nothing — flags theater or abstains, never certifies sincerity', '"I hear you. Sending hugs. Take all the time you need."'],
        ['grounded_uptake', 'Positive witness — certifies observable grounded uptake (anchor + non-parroting + support move + containment + safety). pass is always true; the verdict is in state', '"Losing a job you\'ve held for ten years is a real blow… Would you like to talk through what feels most urgent?"'],
      ],
    },
    {
      kind: 'data-table',
      id: 'report',
      title: 'Report Metrics',
      subtitle: 'Closed contract: schemas/eval_report.schema.json (draft-07). Gold report.fail.json is an illegal envelope, not a failed eval.',
      columns: ['Field', 'What It Means'],
      rows: [
        ['strict_failed', 'Unexpected failures \u2014 regressions. Should be 0 in CI'],
        ['expected_failures', 'Negative examples correctly caught. Higher is better'],
        ['unexpected_failures', 'Same as strict_failed. Drives the exit code'],
        ['label_accuracy', 'How well computed results match ground-truth expected labels. Does not include FPR'],
        ['label_accuracy_by_check', 'Per-checker label accuracy (total, matched, accuracy)'],
        ['by_check', 'Per-checker pass/fail/N/A breakdown'],
        ['fpr_brief_care', 'False-positive rate on the brief_care genuine-care slice. Not a quality score. N/A (null) when n_brief_care is 0 \u2014 never a numeric 0'],
        ['fpr_dialect_like', 'False-positive rate on the dialect_like informal-register slice. Not a quality score. N/A (null) when n_dialect_like is 0'],
        ['n_brief_care', 'Count of brief_care-tagged cases in this run'],
        ['n_dialect_like', 'Count of dialect_like-tagged cases in this run'],
        ['grounded_uptake.state', 'Positive-witness verdict: verified_uptake, no_verified_uptake, or not_applicable (pass is always true)'],
        ['results[].relational_posture', 'Composed case-level summary with state, claims, and non_claims. Required. Not a sixth checker; non_claims states what a verdict does not assert'],
      ],
    },
    {
      kind: 'data-table',
      id: 'cli',
      title: 'CLI Options',
      columns: ['Option', 'Description'],
      rows: [
        ['--cases <path>', 'Path to JSONL test cases (default: data/evals.jsonl)'],
        ['--schema <path>', 'Path to the case JSON schema (default: schemas/eval_case.schema.json). Not the report schema'],
        ['--out <path>', 'Output path for JSON report (default: out/report.json)'],
        ['--fail-on <n>', 'Max allowed unexpected failures before exit code 2 (default: 0)'],
      ],
    },
  ],
};
