/**
 * F2 public-barrel snapshot.
 *
 * Value exports on "." are the locked runner + report helpers.
 * Named checkers stay off the barrel. Type-only re-exports erase
 * (F-7881e1a1) and must not appear in Object.keys.
 */

import { describe, it, expect } from 'vitest';
import { join, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
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

const REPO_ROOT = join(__dirname, '..');
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

function hrefInsideRepo(href: string): boolean {
  let file: string;
  try {
    file = href.startsWith('file:') ? fileURLToPath(href) : href;
  } catch {
    return false;
  }
  const rel = relative(REPO_ROOT, file);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

describe('F2 public barrel', () => {
  it('snapshots Object.keys of ../src/index.ts to the locked value set', () => {
    assertLockedBarrel(barrel);
  });

  it('imports @mcptoolshop/synthesis when the public specifier resolves in-tree', async () => {
    let href: string;
    try {
      href = import.meta.resolve('@mcptoolshop/synthesis');
    } catch {
      // npm test runs before npm run build; dist may already exist from a
      // prior verify. Unresolvable specifier is skip, not a failed snapshot.
      return;
    }
    if (!hrefInsideRepo(href)) {
      return;
    }
    const spec = await import('@mcptoolshop/synthesis');
    assertLockedBarrel(spec);
  });
});
