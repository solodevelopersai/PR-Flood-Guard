import { describe, expect, it } from "vitest";
import { defaultConfig } from "../src/config/default.js";
import { scorePullRequest } from "../src/core/scorer.js";
import type { PullRequestContext } from "../src/core/types.js";

const now = new Date("2026-01-01T00:00:00.000Z");

function context(
  overrides: Partial<PullRequestContext> = {},
): PullRequestContext {
  return {
    title: "Add pagination to search results",
    body: "## Summary\nAdds pagination for search results, with tests and documentation.",
    commits: ["feat: add search pagination"],
    files: [
      { filename: "src/search.ts", additions: 20, deletions: 4 },
      { filename: "src/search.test.ts", additions: 18, deletions: 0 },
      { filename: "docs/search.md", additions: 8, deletions: 0 },
    ],
    author: {
      login: "contributor",
      createdAt: "2020-01-01T00:00:00Z",
      previousPullRequests: 8,
      mergedPullRequests: 5,
    },
    branchName: "feature/search-pagination",
    additions: 46,
    deletions: 4,
    linkedIssue: true,
    ...overrides,
  };
}

describe("scorePullRequest", () => {
  it("returns a high score with low risk for a well-described, tested change", () => {
    const result = scorePullRequest(context(), defaultConfig, now);
    expect(result.score).toBe(100);
    expect(result.risk).toBe("low");
    expect(result.triggeredRules).toEqual([]);
    expect(result.suggestedAction).toBe("none");
    expect(result.summary).toContain("No configured");
  });

  it("keeps a one-line documentation typo fix low risk", () => {
    const result = scorePullRequest(
      context({
        title: "Fix typo in README",
        body: "Corrects a typo in the README.",
        files: [{ filename: "README.md", additions: 1, deletions: 0 }],
        additions: 1,
        deletions: 0,
      }),
      defaultConfig,
      now,
    );
    expect(result.risk).toBe("low");
    expect(result.triggeredRules.map((rule) => rule.name)).not.toContain(
      "suspicious-diff-size",
    );
  });

  it("caps the combined generic title and commit penalty", () => {
    const result = scorePullRequest(
      context({
        title: "Update",
        commits: ["Update"],
      }),
      defaultConfig,
      now,
    );
    const combinedPenalty = result.triggeredRules
      .filter((rule) =>
        ["generic-title", "weak-commit-messages"].includes(rule.name),
      )
      .reduce((total, rule) => total + rule.impact, 0);
    expect(combinedPenalty).toBeLessThanOrEqual(25);
    expect(result.score).toBeGreaterThanOrEqual(75);
  });

  it("keeps a generic, empty-description one-line code change high risk", () => {
    const result = scorePullRequest(
      context({
        title: "Update",
        body: "",
        commits: ["Update"],
        files: [{ filename: "src/app.ts", additions: 1, deletions: 0 }],
        author: { login: "new-user", createdAt: "2025-12-20T00:00:00Z" },
        branchName: "wip",
        additions: 1,
        deletions: 0,
        linkedIssue: false,
      }),
      defaultConfig,
      now,
    );
    expect(["high", "critical"]).toContain(result.risk);
    expect(result.triggeredRules.map((rule) => rule.name)).toContain(
      "suspicious-diff-size",
    );
  });

  it("explains multiple independent quality signals", () => {
    const result = scorePullRequest(
      context({
        title: "Update",
        body: "fix",
        commits: ["Update"],
        files: [{ filename: "src/app.ts", additions: 1, deletions: 0 }],
        author: { login: "new-user", createdAt: "2025-12-20T00:00:00Z" },
        branchName: "wip",
        additions: 1,
        deletions: 0,
        linkedIssue: false,
        codeCommentText: ["+// As an AI, I hope this helps"],
      }),
      defaultConfig,
      now,
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.risk).toBe("critical");
    expect(result.triggeredRules.map((rule) => rule.name)).toEqual(
      expect.arrayContaining([
        "generic-title",
        "weak-description",
        "no-linked-issue",
        "weak-commit-messages",
        "suspicious-diff-size",
        "no-tests-changed",
        "new-account",
        "ai-style-language",
        "generic-branch-name",
        "no-docs-changed",
      ]),
    );
    expect(result.triggeredRules.every((rule) => rule.impact > 0)).toBe(true);
  });

  it("skips unavailable author and linked issue signals", () => {
    const result = scorePullRequest(
      context({
        body: "A useful description that explains the reason and the validation performed.",
        author: { login: "contributor" },
        linkedIssue: undefined,
      }),
      defaultConfig,
      now,
    );
    expect(result.triggeredRules.map((rule) => rule.name)).not.toContain(
      "new-account",
    );
    expect(result.triggeredRules.map((rule) => rule.name)).not.toContain(
      "no-linked-issue",
    );
  });

  it("maps score boundaries to configured risk thresholds", () => {
    const riskyConfig = {
      ...defaultConfig,
      thresholds: { critical: 10, high: 30, medium: 70 },
    };
    const result = scorePullRequest(context(), riskyConfig, now);
    expect(result.risk).toBe("low");
    const critical = scorePullRequest(
      context({
        title: "Update",
        body: "",
        commits: ["Fix"],
        files: [{ filename: "src/app.ts", additions: 0, deletions: 0 }],
        author: { login: "new-user", createdAt: "2025-12-20T00:00:00Z" },
        branchName: "wip",
        additions: 0,
        deletions: 0,
        linkedIssue: false,
      }),
      defaultConfig,
      now,
    );
    expect(critical.risk).toBe("critical");
  });
});
