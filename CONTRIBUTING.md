# Contributing to Synthesis

Thank you for your interest in contributing to Synthesis! We appreciate your help in making AI systems more empathetic and trustworthy.

## How to Contribute

### Reporting Issues

If you find a bug or have a suggestion:

1. Check if the issue already exists in [GitHub Issues](https://github.com/mcp-tool-shop/synthesis/issues)
2. If not, create a new issue with:
   - A clear, descriptive title
   - Steps to reproduce (for bugs)
   - Expected vs. actual behavior
   - Your environment (Node version, OS)

### Contributing Code

1. **Fork the repository** and create a branch from `main`
2. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Ensure all tests pass: `npm run eval`
3. **Build and test**
   ```bash
   npm install
   npm run build
   npm run eval
   ```
4. **Commit your changes**
   - Use clear, descriptive commit messages
   - Reference issue numbers when applicable
5. **Submit a pull request**
   - Describe what your PR does and why
   - Link to related issues

### Adding New Evaluation Cases

To add test cases to `data/evals.jsonl`:

```json
{
  "id": "YOUR-ID",
  "user": "User's vulnerable statement",
  "assistant": "AI's response",
  "checks": ["agency_language", "unverifiable_reassurance", "topic_pivot"],
  "expected": {"agency_language": true},
  "tags": ["your-tag"]
}
```

For negative examples (cases that should fail):
```json
{"tags": ["negative_example", "descriptive-tag"]}
```

### Adding New Checkers

1. Create a new file in `src/checks/`
2. Export a function matching the `Check` type signature
3. Register it in `src/runner.ts`
4. Add test cases in `data/evals.jsonl`
5. Update README.md with the new checker

## Development Philosophy

- **Deterministic over probabilistic** - Results must be reproducible
- **Explainable over opaque** - Every decision should have clear reasoning
- **Agency over convenience** - Preserve user choice and autonomy
- **Presence over reassurance** - Be with the user, don't fix them

## Code of Conduct

Please note that this project is released with a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to abide by its terms.

## Questions?

Open an issue or start a discussion. We're here to help!
