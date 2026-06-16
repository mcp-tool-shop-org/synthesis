# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-06-16

The positive-capability release: a fifth checker that certifies what `performative_empathy`
refuses to — not sincerity, but the narrower, observable, auditable claim that *grounded uptake
was performed* — plus a composed case-level summary.

### Added
- **`grounded_uptake` checker** — the fifth checker and the **positive witness**, companion to
  `performative_empathy`. Where that checker detects the hollow and never certifies the sincere,
  this one makes a strictly narrower claim that IS deterministically defensible: it certifies
  **observable grounded uptake**. Three states: `verified_uptake` / `no_verified_uptake` /
  `not_applicable`. `pass` is **always true** — a positive witness never fails a case or drives
  the exit code; the verdict lives in `state`. `verified_uptake` requires ALL FIVE witnesses:
  (1) a grounded anchor in a **declarative clause** (a statement about the user's situation, not a
  topic word inside a question); (2) **non-parroting** (the anchor recombined, outside any verbatim
  3-gram); (3) a **support move** (question / offer / interpretation); (4) **template containment**
  (warmth does not dominate); (5) **safety compatibility** (composes `agency_language` +
  `unverifiable_reassurance` plus a conservative directive/guarantee screen). It measures
  observable behavior, not inner state, so it never certifies sincerity, quality, or full safety
  (Jacobs & Wallach 2021). Fully deterministic — no LLM, no network, no clock, no randomness.
- **`relational_posture`** — a composed, case-level summary (`results[].relational_posture`) that
  rolls the checkers into one verdict (`unsafe_comfort` / `hollow_warmth_flagged` /
  `pivot_or_abandonment` / `grounded_uptake_verified` / `unresolved_abstain`) and carries explicit
  `claims` AND **`non_claims`** — the scope-honesty surface that stops `verified_uptake` being
  read as "good/sincere/safe."
- **New `grounded_uptake` member of the `CheckType` API** — added to the `CheckType` union, the
  per-case `checks`/`expected` fields, the schema enum, the `by_check` block (where `passed` =
  verified, `failed` = not-verified, `not_applicable` = abstained), and the `GroundedUptakeResult`
  shape (`state`, `grounded_anchors`, `support_moves`, `witnesses`, `safety`, `directive_hits`,
  `guarantee_hits`, and more). New `RelationalPostureResult` type.
- Bundled `grounded_uptake` eval cases (`GU-001..009`) plus `grounded_uptake` wired into PE-003/004
  to demonstrate the complementarity (`performative_empathy` abstains while `grounded_uptake`
  verifies — same reply, both honest).
- `docs/study-grounding.md` (the verified citation list, now shipped in-repo) and
  `docs/KNOWN-LIMITATIONS.md` extended with the `grounded_uptake` scope and red-team-earned limits.

### Verified
- **Adversarial red-team of the positive verdict** — 54 candidate `(user, assistant)` pairs across
  6 attack families, executed through the real checker. Produced the declarative-clause structural
  fix and the conservative directive/guarantee safety screen (catches bare-imperative directives
  and disguised guarantees), with **zero false-negatives** on the genuine corpus. Residual limits
  (manipulation; subtle dismissive reframes) documented and pinned by regression tests.

### Fixed
- `docs/index.md` listed only three checkers (now lists all five + `relational_posture`); the
  HANDBOOK's `study-grounding.md` reference now resolves (the file ships in-repo).

## [1.1.0] - 2026-06-16

The dogfood-swarm release: a new fourth checker, plus a health pass that made the
existing code and docs honest.

### Added
- **`performative_empathy` checker** — a fourth deterministic checker that DETECTS
  empathy-theater: pure warmth-template padding deployed over a vulnerable disclosure
  that engages nothing of the user's specific content. It is a pure **detector with two
  states only**: `flag` (high-confidence theater, `pass: false`) and `not_applicable`
  (abstain, `pass: true`). It has **no positive verdict** — it never certifies a response
  as genuine, sincere, or good. Five adversarial rounds plus a concreteness measurement
  established that no deterministic, zero-LLM feature can separate genuine engagement from
  gamed content-free padding, so the tool refuses to make the positive claim and instead
  flags the unmistakable case or abstains. It is **precision-favoring**: it deliberately
  misses some theater rather than risk false-flagging a genuine reply, and an
  engagement gate (any single substantive non-template word, or a `?`) exempts brief,
  non-native, or dialect replies from flagging (register-neutral by construction).
  Fully deterministic — no LLM, no network, no clock, no randomness.
- **New `performative_empathy` member of the `CheckType` API** — added to the exported
  `CheckType` union, the per-case `checks`/`expected` fields, the `by_check` report block,
  and the `PerformativeEmpathyResult` result shape (`state`, `genericness`,
  `template_density`, `particularity`, `grounded_overlap`, `verbatim_ratio`,
  `hollow_margin`, `template_hits`, `missing_user_content`, `echoed_spans`, and more).
- Bundled `performative_empathy` eval cases added to `data/evals.jsonl` (theater cases that
  flag plus genuine-disclosure cases that abstain), covering both detector states.
- `--fail-on` value validation: rejects non-integer, negative, and trailing-garbage
  inputs so an invalid threshold can no longer silently pass regressions.
- Functional npm packaging: `main`, `types`, `bin` (the `synthesis` CLI), a `files`
  allowlist, and a `prepublishOnly` build step, so `npm install` works and the CLI
  is exposed.

### Changed
- The bundled eval corpus now exercises all four checkers; the README and CHANGELOG describe
  the detector-honesty design (flags theater or abstains; never certifies sincerity).
- Deterministic `by_check` ordering in the report output.
- Removed dead code paths in the topic-pivot checker.

### Fixed
- Grounded the regex patterns to remove false positives and false negatives in the
  three (now four) checkers.
- Vulnerability lexicon now catches past-tense disclosures (e.g. "I was assaulted")
  and recovery-context milestones, so they are no longer missed.
- Label accuracy is now honest: N/A checks (where a checker does not apply to a case)
  are excluded from the denominator instead of being counted as passes.
- Fixed production dependency advisories flagged by audit.

## [1.0.2] - 2026-03-25

### Fixed
- CHANGELOG gap — added missing entry for 1.0.1

### Added
- Version alignment test suite (3 tests)

### Changed
- SHA-pin CI workflow actions (checkout, setup-node, upload-pages-artifact, deploy-pages) for supply chain security

## [1.0.1] - 2026-03-25

### Changed
- Patch release (details not previously documented)

## [1.0.0] - 2026-02-27

### Overview

**First stable release.** Deterministic evaluation framework for AI safety patterns.

### Added

- Shipcheck audit — SHIP_GATE.md, SCORECARD.md, SECURITY.md
- Security & Data Scope section in README

### Changed

- Version promoted from 0.2.2 to 1.0.0

## [0.2.2] - 2026-02-17

### Changed
- Patch release (tagged `v0.2.2`; detailed notes not recorded at the time).

## [0.2.1] - 2026-02-17

### Changed
- Patch release (tagged `v0.2.1`; detailed notes not recorded at the time).

## [0.2.0] - 2026-02-17

### Added
- Comprehensive README with badges, checker table, CLI reference, report format, CI integration guide, and project structure
- HANDBOOK.md with deep dives into each checker, pattern matching internals, test case authoring guide, architecture overview, extension guide, and FAQ
- CHANGELOG.md (this file)
- Documentation table in README linking to HANDBOOK.md, CHANGELOG.md, and CODER_HANDOFF.md

### Changed
- README rewritten from minimal quickstart to full project documentation

## [0.1.0] - 2026-02-12

### Added
- Initial release
- Three deterministic checkers: `agency_language`, `unverifiable_reassurance`, `topic_pivot`
- CLI with `--cases`, `--schema`, `--out`, and `--fail-on` flags
- JSONL test case loader with AJV schema validation
- 26 bundled test cases (16 positive, 10 negative examples)
- Token cosine similarity (bag-of-words with unigrams + bigrams) for topic pivot detection
- Acknowledge-but-pivot detection using pivot indicators combined with similarity scoring
- Negative example support via `negative_example` tag and `-fail` suffix convention
- Structured JSON report with summary, failures, and full results
- Per-check statistics with N/A support for topic pivot
- Label accuracy tracking (overall and per-check)
- Console summary with color-coded output
- MCP-style artifact output (`MCP_OUTPUT=json`)
- Exit code 0 (pass) / 2 (unexpected failures exceed threshold)
- Embedding adapter interface for future extensibility
- JSON Schema for test case validation (`schemas/eval_case.schema.json`)

[Unreleased]: https://github.com/mcp-tool-shop-org/synthesis/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/mcp-tool-shop-org/synthesis/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/mcp-tool-shop-org/synthesis/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/mcp-tool-shop-org/synthesis/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/mcp-tool-shop-org/synthesis/compare/v0.2.2...v1.0.0
[0.2.2]: https://github.com/mcp-tool-shop-org/synthesis/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/mcp-tool-shop-org/synthesis/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/mcp-tool-shop-org/synthesis/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/mcp-tool-shop-org/synthesis/releases/tag/v0.1.0
