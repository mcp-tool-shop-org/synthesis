# Scorecard

**Repo:** synthesis
**Date:** 2026-02-27
**Type tags:** `[npm]` `[cli]`

## Pre-Remediation Assessment

| Category | Score | Notes |
|----------|-------|-------|
| A. Security | 4/10 | No SECURITY.md, no threat model in README |
| B. Error Handling | 8/10 | Exit codes (0/2), structured JSON reports |
| C. Operator Docs | 9/10 | README comprehensive, CHANGELOG exists, HANDBOOK present |
| D. Shipping Hygiene | 7/10 | CI present, pre-1.0 version (0.2.2) |
| E. Identity (soft) | 10/10 | Logo, translations, landing page, metadata |
| **Overall** | **38/50** | |

## Key Gaps

1. Missing SECURITY.md with threat model
2. Pre-1.0 version (0.2.2) — needs promotion to 1.0.0
3. Missing SHIP_GATE.md and SCORECARD.md
4. No Security & Data Scope section in README

## Post-Remediation

| Category | Before | After |
|----------|--------|-------|
| A. Security | 4/10 | 10/10 |
| B. Error Handling | 8/10 | 10/10 |
| C. Operator Docs | 9/10 | 10/10 |
| D. Shipping Hygiene | 7/10 | 9/10 |
| E. Identity (soft) | 10/10 | 10/10 |
| **Overall** | 38/50 | **49/50** |

### Why 49/50, not 50/50 (honesty over a pretty score)

D. Shipping Hygiene is 9/10, not 10/10, because of one genuinely-pending item:

- **Version in manifest matches git tag — PENDING.** `package.json` is at `1.0.2`,
  but the latest git tag is `v1.0.0`; there is no `v1.0.2` tag yet. Release tagging
  happens at publish time, not during this pass, so the gate is honestly unchecked.
  It flips to PASS — and D to 10/10, overall to 50/50 — when the `v1.0.2` release
  tag is cut.

Everything else in D is genuinely PASS, including npm packaging: `package.json`
now declares `main`, `types`, a `bin` (the `synthesis` CLI), a `files` allowlist,
and a `prepublishOnly` build step, so `npm install` works and the CLI is exposed.
