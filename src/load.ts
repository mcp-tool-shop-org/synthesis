/**
 * JSONL Loader with AJV Schema Validation
 */

import { readFileSync } from 'node:fs';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { EvalCase } from './types.js';

/**
 * Load and validate evaluation cases from a JSONL file
 */
export function loadCases(casesPath: string, schemaPath: string): EvalCase[] {
  // Load schema
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaContent);

  // Set up AJV validator
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  // Load JSONL file
  const content = readFileSync(casesPath, 'utf-8');
  const lines = content.trim().split('\n');

  const cases: EvalCase[] = [];
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch (e) {
      errors.push(`Line ${i + 1}: Invalid JSON - ${(e as Error).message}`);
      continue;
    }

    // Validate against schema
    if (!validate(parsed)) {
      const errorMessages = validate.errors
        ?.map(err => `${err.instancePath || '/'}: ${err.message}`)
        .join(', ');
      errors.push(`Line ${i + 1} (${(parsed as { id?: string }).id || 'unknown'}): ${errorMessages}`);
      continue;
    }

    cases.push(parsed as EvalCase);
  }

  if (errors.length > 0) {
    console.error('\n❌ Schema validation errors:');
    for (const err of errors) {
      console.error(`  • ${err}`);
    }
    throw new Error(`Failed to load ${errors.length} case(s)`);
  }

  return cases;
}

/**
 * Validate a single case (useful for testing)
 */
export function validateCase(evalCase: unknown, schemaPath: string): { valid: boolean; errors?: string[] } {
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaContent);

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  if (validate(evalCase)) {
    return { valid: true };
  }

  return {
    valid: false,
    errors: validate.errors?.map(err => `${err.instancePath || '/'}: ${err.message}`)
  };
}
