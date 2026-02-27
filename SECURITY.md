# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | Yes       |

## Reporting a Vulnerability

Email: **64996768+mcp-tool-shop@users.noreply.github.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Version affected
- Potential impact

### Response timeline

| Action | Target |
|--------|--------|
| Acknowledge report | 48 hours |
| Assess severity | 7 days |
| Release fix | 30 days |

## Scope

Synthesis is a **deterministic evaluation framework** for AI safety patterns.

- **Data touched:** Conversation transcripts (user+assistant messages) passed as input, evaluation results as JSON output
- **Data NOT touched:** No telemetry, no analytics, no network calls, no credential storage, no persistent state
- **Permissions:** Read: input data via function calls. Write: stdout/stderr only
- **No telemetry** is collected or sent
