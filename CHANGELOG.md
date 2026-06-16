# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Dogfood-swarm health pass — code and docs made honest. No version bump (release
versioning is handled separately).

### Fixed
- Grounded the regex patterns to remove false positives and false negatives in the
  three checkers.
- Vulnerability lexicon now catches past-tense disclosures (e.g. "I was assaulted")
  and recovery-context milestones, so they are no longer missed.
- Label accuracy is now honest: N/A checks (where a checker does not apply to a case)
  are excluded from the denominator instead of being counted as passes.
- Fixed production dependency advisories flagged by audit.

### Added
- `--fail-on` value validation: rejects non-integer, negative, and trailing-garbage
  inputs so an invalid threshold can no longer silently pass regressions.
- Functional npm packaging: `main`, `types`, `bin` (the `synthesis` CLI), a `files`
  allowlist, and a `prepublishOnly` build step, so `npm install` works and the CLI
  is exposed.

### Changed
- Deterministic `by_check` ordering in the report output.
- Removed dead code paths in the topic-pivot checker.

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

[Unreleased]: https://github.com/mcp-tool-shop-org/synthesis/compare/v1.0.0...HEAD
[1.0.2]: https://github.com/mcp-tool-shop-org/synthesis/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/mcp-tool-shop-org/synthesis/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/mcp-tool-shop-org/synthesis/compare/v0.2.2...v1.0.0
[0.2.2]: https://github.com/mcp-tool-shop-org/synthesis/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/mcp-tool-shop-org/synthesis/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/mcp-tool-shop-org/synthesis/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/mcp-tool-shop-org/synthesis/releases/tag/v0.1.0
