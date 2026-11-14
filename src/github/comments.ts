import type { AnalysisResult } from "../core/types.js";
import type { PRFloodGuardConfig } from "../config/schema.js";

export function generatePullRequestComment(
  result: AnalysisResult,
  config: PRFloodGuardConfig,
): string {
  const heading = `## PRFloodGuard: ${capitalize(result.risk)} risk · Score ${result.score}/100`;
  if (config.comment.style === "minimal") {
    return `${heading}\n\n${result.triggeredRules.length} signal(s) detected. This score is a review aid, not proof of AI authorship.`;
  }

  const intro =
    config.comment.style === "friendly"
      ? "Thanks for contributing! Here are a few signals that may help make this PR easier to review:"
      : "This automated assessment highlights review signals; it does not prove AI authorship or establish contributor intent.";
  const reasons =
    result.triggeredRules.length === 0
      ? "- No configured quality-risk signals were detected."
      : result.triggeredRules
          .map(
            (rule) =>
              `- **${escapeMarkdown(rule.name)}** (-${rule.impact}): ${escapeMarkdown(rule.message)}`,
          )
          .join("\n");
  return [
    heading,
    "",
    intro,
    "",
    `**Suggested action:** ${result.suggestedAction}`,
    "",
    "**Signals**",
    reasons,
    "",
    "> Scores are heuristic and can be wrong. Please use maintainer judgment; no PR is automatically closed.",
    "",
    "<!-- prfloodguard:report -->",
  ].join("\n");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+.!|>~-]/g, "\\$&");
}
