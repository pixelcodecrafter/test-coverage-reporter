import "jest";
import type { Context } from "@actions/github/lib/context";

import { Inputs, CoverageDiff, DiffReport, DiffSummary } from "./types";
import { getTemplateVars, decimalToString } from "./output";

describe("output", () => {
  describe("getTemplateVars", () => {
    let inputs: Inputs;

    beforeEach(() => {
      inputs = {
        title: "test",
        accessToken: "",
        coveragePath: "coverage/report-final.json",
        baseCoveragePath: "base/coverage/report-final.json",
        customMessage: "",
        failDelta: 0.2,
        stripPathPrefix: "",
        context: {
          issue: {
            number: 123,
          },
          payload: {
            pull_request: {
              head: {
                sha: "1234567890",
              },
            },
            repository: {
              html_url: "https://github.com/jgillick/test-coverage-reporter",
            },
          },
        } as unknown as Context,
      };
    });

    const generateFileSummary = ({
      total,
      percent,
      diff,
    }: {
      total: number;
      percent: number;
      diff: number;
    }): DiffSummary => {
      const summary: CoverageDiff = {
        total,
        percent,
        diff,
      };
      return {
        lines: summary,
        statements: summary,
        functions: summary,
        branches: summary,
        isNewFile: false,
      };
    };

    const generateReport = ({
      total = 0,
      percent = 0,
      diff = 0,
    }: {
      total?: number;
      percent?: number;
      diff?: number;
    } = {}): DiffReport => {
      const summary: CoverageDiff = {
        total,
        percent,
        diff,
      };
      return {
        total: {
          lines: {
            total: 1234,
            diff: -12.15,
            percent: 82.123,
          },
          statements: summary,
          functions: summary,
          branches: summary,
        },
      };
    };

    test("get vars", () => {
      const report = generateReport({
        total: 100,
        percent: 85,
        diff: 2.34,
      });
      report.file1 = generateFileSummary({
        total: 1000,
        percent: 82.1,
        diff: 3.45,
      });

      const vars = getTemplateVars(report, inputs);
      expect(vars).toEqual({
        coverageFileFailurePercent: null,
        changed: [
          {
            filepath: "file1",
            isNewFile: false,
            lines: { percent: "82.1", diff: "3.5" },
            statements: { percent: "82.1", diff: "3.5" },
            functions: { percent: "82.1", diff: "3.5" },
            branches: { percent: "82.1", diff: "3.5" },
          },
        ],
        all: [
          {
            filepath: "file1",
            isNewFile: false,
            lines: { percent: "82.1", diff: "3.5" },
            statements: { percent: "82.1", diff: "3.5" },
            functions: { percent: "82.1", diff: "3.5" },
            branches: { percent: "82.1", diff: "3.5" },
          },
        ],
        unchanged: [],
        total: { lines: "1,234", diff: "-12.2", percent: "82.1" },
        hasDiffs: true,
        title: "test",
        customMessage: "",
        commitSha: "1234567890",
        commitUrl:
          "https://github.com/jgillick/test-coverage-reporter/commits/1234567890",
        prIdentifier: "<!-- test-coverage-reporter-output -->",
        renderFileSummary: expect.anything(),
      });
    });

    test("unchanged file", () => {
      const report = generateReport();
      report.file1 = generateFileSummary({
        total: 100,
        percent: 85,
        diff: 0,
      });

      const vars = getTemplateVars(report, inputs);
      expect(vars.changed.length).toBe(0);
      expect(vars.unchanged.length).toBe(1);
    });

    test("changed file", () => {
      const report = generateReport();
      report.file1 = generateFileSummary({
        total: 100,
        percent: 85,
        diff: 1,
      });

      const vars = getTemplateVars(report, inputs);
      expect(vars.changed.length).toBe(1);
      expect(vars.unchanged.length).toBe(0);
    });

    test("file is not changed if diff is too low", () => {
      const report = generateReport();
      report.file1 = generateFileSummary({
        total: 100,
        percent: 85,
        diff: 0.01,
      });

      const vars = getTemplateVars(report, inputs);
      expect(vars.changed.length).toBe(0);
      expect(vars.unchanged.length).toBe(1);
    });

    test("file is change even if diff is negative", () => {
      const report = generateReport();
      report.file1 = generateFileSummary({
        total: 100,
        percent: 85,
        diff: -1,
      });

      const vars = getTemplateVars(report, inputs);
      expect(vars.changed.length).toBe(1);
      expect(vars.unchanged.length).toBe(0);
    });

    test("fail delta returns the max failure number", () => {
      const report = generateReport();
      report.file1 = generateFileSummary({
        total: 100,
        percent: 85,
        diff: -1,
      });
      report.file2 = generateFileSummary({
        total: 100,
        percent: 85,
        diff: -2.123,
      });
      report.file3 = generateFileSummary({
        total: 100,
        percent: 85,
        diff: -1.5,
      });

      const vars = getTemplateVars(report, inputs);
      expect(vars.coverageFileFailurePercent).toBe("2.1");
    });
  });

  describe("decimalToString", () => {
    test("round to a single decimal place", () => {
      const val = decimalToString(1.151);
      expect(val).toBe("1.2");
    });

    test("strip trailing zero", () => {
      const val = decimalToString(1);
      expect(val).toBe("1");
    });

    test("include leading zero", () => {
      const val = decimalToString(0.1);
      expect(val).toBe("0.1");
    });

    test("rounding negative numbers", () => {
      const val = decimalToString(-1.15);
      expect(val).toBe("-1.2");
    });
  });
});
