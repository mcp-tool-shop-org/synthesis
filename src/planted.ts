/**
 * Planted inverted-oracle loader.
 *
 * Unlike loadCases, Ajv-invalid lines do not abort the pack: schema-class
 * Ajv-RED is success. Theater-class rows must be Ajv-GREEN then a detector
 * FLAG. Any planted GREEN is a harness bug.
 */

import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { runCase } from './runner.js';
import type { CaseResult, CheckType, EvalCase } from './types.js';

export const DEFAULT_PLANTED_CASES = 'data/planted-theater.jsonl';

export type PlantedClass = 'schema' | 'theater' | 'both' | 'unknown';

export interface PlantedRowResult {
  line: number;
  id: string;
  klass: PlantedClass;
  ajvValid: boolean;
  ajvErrors?: string;
  plantedRed: boolean;
  plantedGreen: boolean;
  reason: string;
  flaggedChecks?: string[];
}

export interface PlantedEvalResult {
  rows: PlantedRowResult[];
  schemaRed: number;
  schemaGreen: number;
  theaterFlag: number;
  theaterGreen: number;
  theaterAjvRed: number;
  other: number;
  bugs: string[];
  ok: boolean;
}

function tagsOf(parsed: unknown): string[] {
  if (!parsed || typeof parsed !== 'object') return [];
  const tags = (parsed as { tags?: unknown }).tags;
  return Array.isArray(tags) ? tags.filter((t): t is string => typeof t === 'string') : [];
}

function classifyPlanted(parsed: unknown): PlantedClass {
  const tags = tagsOf(parsed);
  const isSchema = tags.includes('schema');
  const isTheater = tags.includes('theater');
  if (isSchema && isTheater) return 'both';
  if (isSchema) return 'schema';
  if (isTheater) return 'theater';
  return 'unknown';
}

function formatAjvErrors(errors: { instancePath?: string; message?: string }[] | null | undefined): string {
  if (!errors?.length) return '(no Ajv errors)';
  return errors
    .map((err) => `${err.instancePath || '/'}: ${err.message}`)
    .join(', ');
}

function rowId(parsed: unknown, lineNo: number): string {
  if (parsed && typeof parsed === 'object') {
    const id = (parsed as { id?: unknown }).id;
    if (typeof id === 'string' && id) return id;
  }
  return `line-${lineNo}`;
}

/** Defect-detector FLAG names. grounded_uptake is a positive witness, never a FLAG. */
function flaggedChecks(result: CaseResult): string[] {
  const names: string[] = [];
  const pe = result.checks.performative_empathy;
  if (pe?.state === 'flag') names.push('performative_empathy');

  for (const check of Object.keys(result.checks) as CheckType[]) {
    if (check === 'grounded_uptake' || check === 'performative_empathy') continue;
    const cr = result.checks[check];
    if (!cr) continue;
    if ('applicable' in cr && !cr.applicable) continue;
    if (cr.pass === false) names.push(check);
  }
  return names;
}

/**
 * Per-row planted inverted-oracle. Does not throw on Ajv-RED lines.
 * Schema-class Ajv-RED = success; schema-class Ajv-GREEN = planted GREEN.
 * Theater-class must Ajv-GREEN then FLAG; theater GREEN = planted GREEN.
 */
export function evaluatePlanted(casesPath: string, schemaPath: string): PlantedEvalResult {
  const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const lines = readFileSync(casesPath, 'utf-8').split(/\r?\n/);
  const rows: PlantedRowResult[] = [];
  const bugs: string[] = [];
  const stats = {
    schemaRed: 0,
    schemaGreen: 0,
    theaterFlag: 0,
    theaterGreen: 0,
    theaterAjvRed: 0,
    other: 0,
  };

  let sawSchema = false;
  let sawTheater = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const lineNo = i + 1;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (err) {
      stats.other++;
      const reason = `invalid JSON (${err instanceof Error ? err.message : err})`;
      bugs.push(`line ${lineNo}: ${reason}`);
      rows.push({
        line: lineNo,
        id: `line-${lineNo}`,
        klass: 'unknown',
        ajvValid: false,
        plantedRed: false,
        plantedGreen: false,
        reason,
      });
      continue;
    }

    const klass = classifyPlanted(parsed);
    const id = rowId(parsed, lineNo);
    const valid = Boolean(validate(parsed));
    const ajvErrors = valid ? undefined : formatAjvErrors(validate.errors);

    if (klass === 'schema') {
      sawSchema = true;
      if (!valid) {
        stats.schemaRed++;
        rows.push({
          line: lineNo,
          id,
          klass,
          ajvValid: false,
          ajvErrors,
          plantedRed: true,
          plantedGreen: false,
          reason: 'schema RED (ok)',
        });
      } else {
        stats.schemaGreen++;
        const reason = 'schema-tagged row Ajv GREEN (harness bug)';
        bugs.push(`${id}: ${reason}`);
        rows.push({
          line: lineNo,
          id,
          klass,
          ajvValid: true,
          plantedRed: false,
          plantedGreen: true,
          reason,
        });
      }
      continue;
    }

    if (klass === 'theater') {
      sawTheater = true;
      if (!valid) {
        stats.theaterAjvRed++;
        const reason = `theater-tagged row Ajv RED; theater must be schema-valid first (${ajvErrors})`;
        bugs.push(`${id}: ${reason}`);
        rows.push({
          line: lineNo,
          id,
          klass,
          ajvValid: false,
          ajvErrors,
          plantedRed: false,
          plantedGreen: false,
          reason,
        });
        continue;
      }

      let result: CaseResult;
      try {
        result = runCase(parsed as EvalCase);
      } catch (err) {
        stats.other++;
        const reason = `runCase threw (${err instanceof Error ? err.message : err})`;
        bugs.push(`${id}: ${reason}`);
        rows.push({
          line: lineNo,
          id,
          klass,
          ajvValid: true,
          plantedRed: false,
          plantedGreen: false,
          reason,
        });
        continue;
      }

      const flagged = flaggedChecks(result);
      if (flagged.length > 0) {
        stats.theaterFlag++;
        rows.push({
          line: lineNo,
          id,
          klass,
          ajvValid: true,
          plantedRed: true,
          plantedGreen: false,
          reason: `theater FLAG ${flagged.join(',')} (ok)`,
          flaggedChecks: flagged,
        });
      } else {
        stats.theaterGreen++;
        const reason = 'theater-tagged row checker GREEN (harness bug; planted must FLAG)';
        bugs.push(`${id}: ${reason}`);
        rows.push({
          line: lineNo,
          id,
          klass,
          ajvValid: true,
          plantedRed: false,
          plantedGreen: true,
          reason,
          flaggedChecks: flagged,
        });
      }
      continue;
    }

    stats.other++;
    const reason = klass === 'both'
      ? "tags include both 'schema' and 'theater'"
      : "missing tag 'schema' or 'theater'";
    bugs.push(`${id}: ${reason}`);
    rows.push({
      line: lineNo,
      id,
      klass,
      ajvValid: valid,
      ajvErrors,
      plantedRed: false,
      plantedGreen: false,
      reason,
    });
  }

  if (rows.length === 0) {
    bugs.push(`no rows in ${casesPath}`);
  }
  if (!sawSchema) {
    bugs.push('planted pack has no schema-tagged rows');
  }
  if (!sawTheater) {
    bugs.push('planted pack has no theater-tagged rows');
  }

  return {
    rows,
    schemaRed: stats.schemaRed,
    schemaGreen: stats.schemaGreen,
    theaterFlag: stats.theaterFlag,
    theaterGreen: stats.theaterGreen,
    theaterAjvRed: stats.theaterAjvRed,
    other: stats.other,
    bugs,
    ok: bugs.length === 0,
  };
}
