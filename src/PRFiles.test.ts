import "jest";
import type { Context } from "@actions/github/lib/context";

import { CoverageSummary } from "./types";
import PRFiles from "./PRFiles";
import * as github from "@actions/github";

type OctoKit = ReturnType<typeof github.getOctokit>;

describe("PRFiles", () => {
  let prFiles: PRFiles;

  beforeEach(() => {
    const inputs = {
      title: "test",
      accessToken: "",
      coveragePath: "coverage/report-final.json",
      baseCoveragePath: "base/coverage/report-final.json",
      customMessage: "",
      failFileReduced: 0.2,
      stripPathPrefix: "",
      context: {
        issue: {
          number: 123,
        },
        repo: {
          repo: "",
          owner: "",
        },
      } as Context,
    };
    prFiles = new PRFiles(inputs);
  });

  describe("fetchPRFiles", () => {
    beforeEach(() => {
      jest.spyOn(github, "getOctokit").mockReturnValue({
        paginate: jest.fn(() =>
          Promise.resolve([
            { filename: "/z" },
            { filename: "/a/b/c" },
            { filename: "/a" },
            { filename: "/c/d/e/f/g" },
            { filename: "/x/y" },
          ])
        ) as unknown as OctoKit,
      } as unknown as OctoKit);
    });

    test("sort files list by path lengt", async () => {
      await prFiles.fetchPRFiles();
      expect(prFiles.files).toEqual([
        "/z",
        "/a",
        "/x/y",
        "/a/b/c",
        "/c/d/e/f/g",
      ]);
    });
  });

  describe("loadCoverage", () => {
    test("find common prefix", async () => {
      const prefix = "/x/y/z";
      const coverage = {
        total: {},
        [`${prefix}/a`]: {},
        [`${prefix}/b/c/d`]: {},
        [`${prefix}/b/c/d/e/f`]: {},
        [`${prefix}/m/n/o/p/q/r`]: {},
      } as unknown as CoverageSummary;

      prFiles.files = ["/a", "/b/c/d", "/b/c/d/e/f"];

      await prFiles.loadCoverage(coverage);
      expect(prFiles.pathPrefix).toBe("/x/y/z");
    });

    test("is in PR", async () => {
      prFiles.pathPrefix = "/x/y/z";
      prFiles.files = ["/a", "/b/c/d", "/b/c/d/e/f"];

      expect(prFiles.inPR("/x/y/z/b/c/d")).toBe(true);
      expect(prFiles.inPR("/x/y/z/b")).toBe(false);
    });
  });
});
