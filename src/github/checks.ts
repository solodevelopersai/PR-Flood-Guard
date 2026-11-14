import type { Octokit } from "@octokit/rest";
import type { AnalysisResult } from "../core/types.js";

export async function createAnalysisCheck(
  octokit: Octokit,
  owner: string,
  repo: string,
  headSha: string,
  result: AnalysisResult,
): Promise<void> {
  const summary = [
    `**Score:** ${result.score}/100 · **Risk:** ${result.risk}`,
    "",
    result.summary,
    "",
    result.triggeredRules.length === 0
      ? "No configured quality-risk signals were detected."
      : result.triggeredRules
          .map(
            (rule) => `- **${rule.name}** (-${rule.impact}): ${rule.message}`,
          )
          .join("\n"),
    "",
    "This heuristic result is a review aid, not proof of AI authorship or contributor intent.",
  ].join("\n");
  await octokit.rest.checks.create({
    owner,
    repo,
    name: "PRFloodGuard",
    head_sha: headSha,
    status: "completed",
    conclusion: "neutral",
    output: {
      title: `${result.risk.toUpperCase()} risk · ${result.score}/100`,
      summary: summary.slice(0, 65_000),
    },
  });
}
