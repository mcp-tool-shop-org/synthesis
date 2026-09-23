# synthesis: how it works

Mapped at 2026-09-23 from commit 0128f11.

## What this is

12 parts. Work enters through 3 doors; the busiest is CI, which reaches 3 parts.

## What changed since the last map

This is the first map.

## What comes in

1. **CI.** On a pull request; on a push to main touching 13 paths; or by hand. Runs scripts/check-report-schema.mjs, scripts/eval-planted.mjs, src/ and 1 more.
2. **Release (npm via Trusted Publishing).** When a release is published; or by hand. Runs scripts/check-report-schema.mjs, src/ and tests/.
3. **Deploy site to GitHub Pages.** On a push to main touching 2 paths; or by hand. Runs no file this map can see.

## What happens through CI

1. The workflow runs scripts/check-report-schema.mjs and scripts/eval-planted.mjs in scripts, src/ in src, and tests/ in tests.

## Who reads the results

CI writes nothing this map can see.

## The other doors

**Release (npm via Trusted Publishing)** runs scripts/check-report-schema.mjs, src/ and tests/, and publishes to npm.

**Deploy site to GitHub Pages** runs no file this map can see and deploys the site.

## What breaks what

- **src** is imported by 1 part (scripts), and by 1 more only from tests; it sits on the path of 2 doors.
- **scripts** is imported by no other part and sits on the path of 2 doors.
- **tests** is imported by no other part and sits on the path of 2 doors.

## What tends to change together

- **src/report.ts** and **src/runner.ts** changed together in 8 of 10 commits, inside the src part.
- **src/checks/performative.ts** and **tests/checks.performative.test.ts** changed together in 6 of 10 commits, and the tests part imports the src part.
- **src/report.ts** and **src/types.ts** changed together in 9 of 16 commits, inside the src part.

Confidence is low: fewer than 20 source files reach 10 revisions in the window.

Window: 180 days; a pair counts from 3 shared commits.

## What no test touches

- **scripts** is imported by no test.

## Written but never read

- **src/checks/lexicons/concreteness.ts** is written by scripts/build-concreteness.mjs and read by nothing else in this repository.

## Helpers that look duplicated

No two parts export a helper that looks alike.

## Generated, never hand-edited

- **src/checks/lexicons/concreteness.ts** is written by scripts/build-concreteness.mjs.

## Hand-authored

People write .claude/, .github/, assets/, data/, docs/, research/, the repository root, schemas/ and site/. Nothing in this repository writes to them.

## Where to start

.github/workflows/ci.yml → src/

Read those in order to follow one pull request end to end.

## What this map cannot see

- 2 import sites could not be resolved.
- 3 writes and 8 reads use paths built at run time and are not named here.
- Statistics confidence is low: fewer than 20 source files reach 10 revisions in the window.

Regenerate with `npx --yes @dogfood-lab/atlas map`.
