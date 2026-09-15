#!/usr/bin/env node
/**
 * Copy-paste library example: import the PUBLIC specifier, not ../src.
 *
 * Locked barrel on '@mcptoolshop/synthesis':
 *   loadCases, validateCase, runCase, runAllCases,
 *   writeReport, printSummary, formatArtifact,
 *   computeRelationalPosture, SUMMARY_FOIL
 * Named checkers (checkAgency, checkPivot, …) are internal — not on ".".
 *
 * Needs dist built and the package resolvable (npm pack / install).
 * Not part of `npm run verify`.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCases, runAllCases } from '@mcptoolshop/synthesis';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cases = loadCases(
  join(root, 'data', 'evals.jsonl'),
  join(root, 'schemas', 'eval_case.schema.json'),
);
const { summary } = runAllCases(cases);
console.log(
  `example: ${summary.cases} cases, ${summary.unexpected_failures} unexpected failures`,
);
