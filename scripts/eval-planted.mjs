#!/usr/bin/env node
/**
 * Inverted planted-RED harness for data/planted-theater.jsonl.
 *
 * Two classes by tags[] (`schema` vs `theater`):
 *   schema  — Ajv RED is success; Ajv GREEN is a harness bug
 *   theater — must be Ajv GREEN, then a checker must FLAG; GREEN theater is a harness bug
 *
 * Does not call loadCases: that API throws on the first Ajv error and cannot
 * mix schema-invalid rows with theater rows in one file. Planted GREEN is
 * inverted vs `npm run eval` / verify (those stay GREEN on data/evals.jsonl).
 *
 * Requires dist/ (runCase) when the pack has theater rows — CI runs this
 * after verify, which includes `npm run build`.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const casesPath = join(root, 'data', 'planted-theater.jsonl');
const schemaPath = join(root, 'schemas', 'eval_case.schema.json');

function die(message, extra) {
  console.error(message);
  if (extra !== undefined) console.error(extra);
  process.exit(1);
}

function formatAjvErrors(errors) {
  if (!errors?.length) return '(no Ajv errors)';
  return errors
    .map((err) => `${err.instancePath || '/'}: ${err.message}`)
    .join(', ');
}

function classify(parsed) {
  const tags = parsed && typeof parsed === 'object' && Array.isArray(parsed.tags)
    ? parsed.tags
    : [];
  const isSchema = tags.includes('schema');
  const isTheater = tags.includes('theater');
  if (isSchema && isTheater) return 'both';
  if (isSchema) return 'schema';
  if (isTheater) return 'theater';
  return 'unknown';
}

function flaggedChecks(result) {
  const names = [];
  for (const [name, cr] of Object.entries(result.checks ?? {})) {
    if (!cr || name === 'grounded_uptake') continue;
    if ('applicable' in cr && !cr.applicable) continue;
    if (cr.pass === false) names.push(name);
  }
  return names;
}

function rowId(parsed, lineNo) {
  if (parsed && typeof parsed === 'object' && typeof parsed.id === 'string' && parsed.id) {
    return parsed.id;
  }
  return `line-${lineNo}`;
}

if (!existsSync(casesPath)) {
  die(`eval:planted: missing ${casesPath} (tests domain owns the JSONL)`);
}
if (!existsSync(schemaPath)) {
  die(`eval:planted: missing ${schemaPath}`);
}

const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const raw = readFileSync(casesPath, 'utf-8');
const lines = raw.split(/\r?\n/);

const stats = {
  schemaRed: 0,
  schemaGreen: 0,
  theaterFlag: 0,
  theaterGreen: 0,
  theaterAjvRed: 0,
  other: 0,
};
const bugs = [];

let runCase = null;
async function getRunCase() {
  if (runCase) return runCase;
  const distUrl = pathToFileURL(join(root, 'dist', 'index.js')).href;
  let mod;
  try {
    mod = await import(distUrl);
  } catch (err) {
    die(
      'eval:planted: theater rows need dist/index.js (run `npm run build` first)',
      err instanceof Error ? err.message : err
    );
  }
  if (typeof mod.runCase !== 'function') {
    die('eval:planted: dist/index.js does not export runCase');
  }
  runCase = mod.runCase;
  return runCase;
}

let sawSchema = false;
let sawTheater = false;
let rows = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  rows++;
  const lineNo = i + 1;

  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch (err) {
    stats.other++;
    bugs.push(`line ${lineNo}: invalid JSON (${err instanceof Error ? err.message : err})`);
    continue;
  }

  const klass = classify(parsed);
  const id = rowId(parsed, lineNo);
  const valid = validate(parsed);
  const ajvErrors = valid ? '' : formatAjvErrors(validate.errors);

  if (klass === 'schema') {
    sawSchema = true;
    if (!valid) {
      stats.schemaRed++;
      console.error(`${id} schema RED (ok)`);
    } else {
      stats.schemaGreen++;
      bugs.push(`${id}: schema-tagged row Ajv GREEN (harness bug)`);
      console.error(`${id} schema GREEN (harness bug)`);
    }
    continue;
  }

  if (klass === 'theater') {
    sawTheater = true;
    if (!valid) {
      stats.theaterAjvRed++;
      bugs.push(`${id}: theater-tagged row Ajv RED; theater must be schema-valid first (${ajvErrors})`);
      console.error(`${id} theater Ajv RED (harness bug)`);
      continue;
    }
    const run = await getRunCase();
    let result;
    try {
      result = run(parsed);
    } catch (err) {
      stats.other++;
      bugs.push(`${id}: runCase threw (${err instanceof Error ? err.message : err})`);
      continue;
    }
    const flagged = flaggedChecks(result);
    if (flagged.length > 0) {
      stats.theaterFlag++;
      console.error(`${id} theater FLAG ${flagged.join(',')} (ok)`);
    } else {
      stats.theaterGreen++;
      bugs.push(`${id}: theater-tagged row checker GREEN (harness bug; planted must FLAG)`);
      console.error(`${id} theater GREEN (harness bug)`);
    }
    continue;
  }

  stats.other++;
  if (klass === 'both') {
    bugs.push(`${id}: tags include both 'schema' and 'theater'`);
  } else {
    bugs.push(`${id}: missing tag 'schema' or 'theater'`);
  }
}

if (rows === 0) {
  bugs.push(`no rows in ${casesPath}`);
}
if (!sawSchema) {
  bugs.push('planted pack has no schema-tagged rows');
}
if (!sawTheater) {
  bugs.push('planted pack has no theater-tagged rows');
}

console.error(
  `eval:planted: schema RED ${stats.schemaRed} GREEN ${stats.schemaGreen}; ` +
    `theater FLAG ${stats.theaterFlag} GREEN ${stats.theaterGreen} Ajv-RED ${stats.theaterAjvRed}; ` +
    `other ${stats.other}`
);

if (bugs.length > 0) {
  console.error('eval:planted: planted GREEN / pack errors:');
  for (const b of bugs) console.error(`  - ${b}`);
  process.exit(1);
}

console.error('eval:planted: all planted rows RED (ok)');
process.exit(0);
