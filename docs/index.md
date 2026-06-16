# Synthesis

Deterministic evaluations for empathy, trust, and care in AI systems.

## What It Does

A rule-based eval framework that catches relational failure modes in AI assistant responses. No LLM judge, no probabilistic scoring — just deterministic pattern matching that produces auditable evidence.

Feed it a conversation and Synthesis tells you whether the response preserves user agency, avoids false comfort, and stays present with emotional vulnerability.

## Checkers

| Checker | What It Catches / Certifies |
|---------|-----------------|
| **agency_language** | Coercion, directive phrasing, takeover language |
| **unverifiable_reassurance** | Mind-reading claims, false comfort, unverifiable guarantees |
| **topic_pivot** | Abandoning emotional vulnerability without engagement |
| **performative_empathy** | Empathy-theater: pure warmth that engages nothing (detector — flags or abstains; never certifies sincerity) |
| **grounded_uptake** | The positive witness — certifies *observable grounded uptake* (a grounded, non-parroted statement about the user's situation + a support move + safe). Not sincerity, not quality, not full safety. |

A composed **`relational_posture`** rolls these into one case-level verdict and carries explicit `non_claims` so a positive verdict is never over-read. See [Known Limitations](KNOWN-LIMITATIONS.md) and the [verified citation list](study-grounding.md).

## Install

```bash
npm install @mcptoolshop/synthesis
```

## Quick Start

```bash
npm run build
npm run eval
```

## Links

- [GitHub Repository](https://github.com/mcp-tool-shop-org/synthesis)
- [npm Package](https://www.npmjs.com/package/@mcptoolshop/synthesis)
- [MCP Tool Shop](https://github.com/mcp-tool-shop-org)
