/**
 * F2 public-barrel snapshot.
 *
 * Value exports on "." are the locked runner + report helpers.
 * Named checkers stay off the barrel. Type-only re-exports erase
 * (F-7881e1a1) and must not appear in Object.keys.
 */

import { describe, it, expect } from 'vitest';
import * as barrel from '../src/index.ts';

const LOCKED_VALUE_EXPORTS = [
  'loadCases',
  'validateCase',
  'runCase',
  'runAllCases',
  'writeReport',
  'printSummary',
  'formatArtifact',
  'computeRelationalPosture',
  'SUMMARY_FOIL',
] as const;

const CHECKERS_NOT_ON_BARREL = [
  'checkAgency',
  'checkPivot',
  'checkReassurance',
  'checkPerformativeEmpathy',
  'checkGroundedUptake',
] as const;

const LOCKED_SORTED = [...LOCKED_VALUE_EXPORTS].sort();

function valueKeys(mod: object): string[] {
  return Object.keys(mod).sort();
}

function assertLockedBarrel(mod: object): void {
  expect(valueKeys(mod)).toEqual(LOCKED_SORTED);
  const keys = Object.keys(mod);
  for (const name of CHECKERS_NOT_ON_BARREL) {
    expect(keys).not.toContain(name);
  }
}

describe('F2 public barrel', () => {
  it('snapshots Object.keys of ../src/index.ts to the locked value set', () => {
    assertLockedBarrel(barrel);
  });
});
