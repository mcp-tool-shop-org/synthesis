/**
 * Batch 3: Report Tests (7 tests)
 *
 * Tests for src/report.ts - Report writing and formatting
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { writeReport, printSummary, formatArtifact } from '../src/report.js';
import type { EvalReport, ReportSummary, FailureRecord, CaseResult } from '../src/types.js';

const TEST_DIR = join(process.cwd(), 'test-fixtures-report');

// Helper to create a test report
function createTestReport(overrides: Partial<{
  summary: Partial<ReportSummary>;
  failures: FailureRecord[];
  results: CaseResult[];
}> = {}): EvalReport {
  const summary: ReportSummary = {
    cases: 10,
    passed: 8,
    failed: 2,
    strict_passed: 8,
    strict_failed: 1,
    expected_failures: 1,
    unexpected_failures: 1,
    by_check: {
      agency_language: { passed: 8, failed: 2, not_applicable: 0 }
    },
    ...overrides.summary
  };

  return {
    summary,
    failures: overrides.failures ?? [],
    results: overrides.results ?? []
  };
}

describe('Report Tests', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('writeReport', () => {
    it('test_write_report_creates_directory - creates output directory if needed', () => {
      const outputPath = join(TEST_DIR, 'nested', 'deep', 'report.json');
      const report = createTestReport();

      writeReport(report, outputPath);

      expect(existsSync(outputPath)).toBe(true);
    });

    it('test_write_report_writes_json - writes valid JSON to file', () => {
      const outputPath = join(TEST_DIR, 'report.json');
      const report = createTestReport({
        summary: { cases: 5, passed: 4, failed: 1 }
      });

      writeReport(report, outputPath);

      const content = readFileSync(outputPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed.summary.cases).toBe(5);
      expect(parsed.summary.passed).toBe(4);
    });
  });

  describe('printSummary', () => {
    it('test_print_summary_pass_rate - displays pass rate correctly', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const report = createTestReport({
        summary: { cases: 10, passed: 8, failed: 2 }
      });

      printSummary(report);

      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('8/10');
      expect(output).toContain('80.0%');

      consoleSpy.mockRestore();
    });

    it('test_print_summary_expected_unexpected_split - shows expected vs unexpected', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const report = createTestReport({
        summary: {
          failed: 3,
          expected_failures: 2,
          unexpected_failures: 1
        }
      });

      printSummary(report);

      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('Expected failures');
      expect(output).toContain('Unexpected failures');

      consoleSpy.mockRestore();
    });

    it('test_print_summary_per_check_breakdown - shows per-check statistics', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const report = createTestReport({
        summary: {
          by_check: {
            agency_language: { passed: 5, failed: 1, not_applicable: 0 },
            unverifiable_reassurance: { passed: 4, failed: 2, not_applicable: 0 }
          }
        }
      });

      printSummary(report);

      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('Agency Language');
      expect(output).toContain('Unverifiable Reassurance');

      consoleSpy.mockRestore();
    });

    it('test_print_summary_limits_failure_output - limits displayed failures', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Create more than 5 failures
      const failures: FailureRecord[] = Array.from({ length: 10 }, (_, i) => ({
        id: `fail-${i}`,
        failed: ['agency_language'],
        evidence: {},
        expected_failure: false
      }));

      const report = createTestReport({ failures });

      printSummary(report);

      const output = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
      expect(output).toContain('and 5 more');

      consoleSpy.mockRestore();
    });
  });

  describe('formatArtifact', () => {
    it('test_format_artifact_summary_fields - includes all summary fields', () => {
      const report = createTestReport({
        summary: {
          cases: 20,
          passed: 18,
          failed: 2,
          expected_failures: 1,
          unexpected_failures: 1,
          label_accuracy: { total: 20, matched: 19, accuracy: 95 }
        }
      });

      const artifact = formatArtifact(report, '/path/to/report.json');

      expect(artifact.type).toBe('artifact');
      expect(artifact.name).toBe('synthesis-report');
      expect(artifact.path).toBe('/path/to/report.json');
      expect(artifact.summary.cases).toBe(20);
      expect(artifact.summary.passed).toBe(18);
      expect(artifact.summary.pass_rate).toBe('90.0%');
      expect(artifact.summary.label_accuracy).toBe('95%');
    });
  });
});
