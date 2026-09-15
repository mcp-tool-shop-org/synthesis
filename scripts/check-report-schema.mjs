#!/usr/bin/env node
/**
 * Ajv-compile schemas/eval_report.schema.json as draft-07 and assert gold
 * polarity: report.good.json MUST validate; report.fail.json MUST NOT.
 *
 * fail = illegal envelope (missing required, extra keys, illegal state),
 * not a failed eval. Does not Ajv live out/report.json (runtime posture-emit
 * is a later wave).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const schemaPath = join(root, 'schemas', 'eval_report.schema.json');
const goodPath = join(root, 'schemas', 'report.good.json');
const failPath = join(root, 'schemas', 'report.fail.json');

function loadJson(path) {
  if (!existsSync(path)) {
    console.error(`check:report-schema: missing ${path}`);
    process.exit(1);
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch (err) {
    console.error(`check:report-schema: cannot parse ${path}: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

function formatAjvErrors(errors) {
  if (!errors?.length) return '(no Ajv errors)';
  return errors
    .map((err) => `${err.instancePath || '/'}: ${err.message}`)
    .join(', ');
}

const schema = loadJson(schemaPath);
const good = loadJson(goodPath);
const fail = loadJson(failPath);

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const goodOk = validate(good);
const goodErrors = goodOk ? '' : formatAjvErrors(validate.errors);
const failOk = validate(fail);
const failErrors = failOk ? '' : formatAjvErrors(validate.errors);

let bad = false;
if (!goodOk) {
  console.error(`check:report-schema: schemas/report.good.json MUST validate (legal envelope): ${goodErrors}`);
  bad = true;
} else {
  console.error('check:report-schema: report.good.json valid (ok)');
}

if (failOk) {
  console.error('check:report-schema: schemas/report.fail.json MUST NOT validate (illegal envelope, not a failed eval)');
  bad = true;
} else {
  console.error(`check:report-schema: report.fail.json rejected (ok): ${failErrors}`);
}

if (bad) process.exit(1);
console.error('check:report-schema: gold polarity holds (draft-07)');
process.exit(0);
