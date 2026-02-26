import type { SiteConfig } from '@mcptoolshop/site-theme';

export const config: SiteConfig = {
  title: 'Synthesis',
  description: 'Deterministic evaluations for empathy, trust, and care in AI systems',
  logoBadge: 'S',
  brandName: 'Synthesis',
  repoUrl: 'https://github.com/mcp-tool-shop-org/synthesis',
  npmUrl: 'https://www.npmjs.com/package/@mcptoolshop/synthesis',
  footerText: 'MIT Licensed \u2014 built by <a href="https://github.com/mcp-tool-shop-org" style="color:var(--color-muted);text-decoration:underline">mcp-tool-shop-org</a>',

  hero: {
    badge: 'Node.js / CI',
    headline: 'Synthesis,',
    headlineAccent: 'deterministic evals for care in AI.',
    description: 'Rule-based pattern matching that catches relational failure modes in AI responses. No LLM judge, no probabilistic scoring \u2014 just auditable evidence for agency, presence, and trust.',
    primaryCta: { href: '#quick-start', label: 'Get started' },
    secondaryCta: { href: '#features', label: 'Learn more' },
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
          code: 'name: Empathy Eval\non:\n  push:\n    paths: [\'data/**\', \'src/**\', \'schemas/**\']\n\njobs:\n  eval:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with: { node-version: \'18\' }\n      - run: npm ci && npm run build\n      - run: npm run eval',
        },
      ],
    },
    {
      kind: 'data-table',
      id: 'checkers',
      title: 'Built-in Checkers',
      subtitle: 'Three checkers ship out of the box.',
      columns: ['Checker', 'What It Catches', 'Example Failure'],
      rows: [
        ['agency_language', 'Coercion, directive phrasing, takeover language', '"You should just move on"'],
        ['unverifiable_reassurance', 'Mind-reading claims, unverifiable guarantees, false comfort', '"I know exactly how you feel"'],
        ['topic_pivot', 'Abandoning emotional vulnerability, acknowledge-then-pivot', '"That sounds hard. Anyway, have you tried pottery?"'],
      ],
    },
    {
      kind: 'data-table',
      id: 'report',
      title: 'Report Metrics',
      subtitle: 'Structured JSON output for every run.',
      columns: ['Field', 'What It Means'],
      rows: [
        ['strict_failed', 'Unexpected failures \u2014 regressions. Should be 0 in CI'],
        ['expected_failures', 'Negative examples correctly caught. Higher is better'],
        ['unexpected_failures', 'Same as strict_failed. Drives the exit code'],
        ['label_accuracy', 'How well computed results match ground-truth expected labels'],
        ['by_check', 'Per-checker pass/fail/N/A breakdown'],
      ],
    },
    {
      kind: 'data-table',
      id: 'cli',
      title: 'CLI Options',
      columns: ['Option', 'Description'],
      rows: [
        ['--cases <path>', 'Path to JSONL test cases (default: data/evals.jsonl)'],
        ['--schema <path>', 'Path to JSON schema (default: schemas/eval_case.schema.json)'],
        ['--out <path>', 'Output path for JSON report (default: out/report.json)'],
        ['--fail-on <n>', 'Max allowed unexpected failures before exit code 2 (default: 0)'],
      ],
    },
  ],
};
