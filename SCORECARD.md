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
| D. Shipping Hygiene | 7/10 | 10/10 |
| E. Identity (soft) | 10/10 | 10/10 |
| **Overall** | 38/50 | **50/50** |

### 50/50 — version-tag gate now PASS

D. Shipping Hygiene reached 10/10 when the `v1.1.0` release was cut:

- **Version in manifest matches git tag — PASS.** `package.json` is `1.2.0` and the
  `v1.2.0` tag is published, with the release built and shipped to npm via Trusted
  Publishing (OIDC). (First satisfied at `v1.1.0`; remains PASS at `v1.2.0`, which adds
  the `grounded_uptake` positive witness + the `relational_posture` summary.)

Everything else in D is genuinely PASS, including npm packaging: `package.json`
now declares `main`, `types`, a `bin` (the `synthesis` CLI), a `files` allowlist,
and a `prepublishOnly` build step, so `npm install` works and the CLI is exposed.
