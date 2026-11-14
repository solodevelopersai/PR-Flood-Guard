import { describe, expect, it } from "vitest";
import { parseConfig } from "../src/config/parser.js";
import { generatePullRequestComment } from "../src/github/comments.js";
import { defaultConfig } from "../src/config/default.js";
import type { AnalysisResult } from "../src/core/types.js";
import { titleRules } from "../src/core/rules/title.js";

describe("individual rules", () => {
  it("flags generic titles, but not specific ones", () => {
    expect(titleRules("Update files")[0]?.name).toBe("generic-title");
    expect(titleRules("Add pagination to search results")).toEqual([]);
  });
});

describe("configuration", () => {
  it("applies defaults to a minimal valid config", () => {
    const config = parseConfig("version: 1");
    expect(config.thresholds).toEqual(defaultConfig.thresholds);
    expect(config.actions).toEqual(defaultConfig.actions);
    expect(config.comment.enabled).toBe(true);
  });

  it("rejects invalid action values and unordered thresholds", () => {
    expect(() =>
      parseConfig(
        "version: 1\nthresholds:\n  critical: 70\n  high: 40\n  medium: 65",
      ),
    ).toThrow("strictly increasing");
    expect(() => parseConfig("version: 1\nactions:\n  high: close")).toThrow(
      "Invalid PRFloodGuard configuration",
    );
  });

  it("rejects malformed YAML with a useful error", () => {
    expect(() => parseConfig("version: [")).toThrow(
      "Invalid PRFloodGuard YAML",
    );
  });
});

describe("comment generation", () => {
  const result: AnalysisResult = {
    score: 42,
    risk: "high",
    triggeredRules: [
      { name: "generic-title", impact: 20, message: "The title is vague." },
    ],
    suggestedAction: "label+comment",
    summary: "One signal found.",
  };

  it("includes the score, explanation, and human-review warning", () => {
    const comment = generatePullRequestComment(result, defaultConfig);
    expect(comment).toContain("Score 42/100");
    expect(comment).toContain("The title is vague\\.");
    expect(comment).toContain("does not prove AI authorship");
    expect(comment).toContain("prfloodguard:report");
  });

  it("supports minimal style", () => {
    const comment = generatePullRequestComment(result, {
      ...defaultConfig,
      comment: { enabled: true, style: "minimal" },
    });
    expect(comment).not.toContain("**Signals**");
  });
});
