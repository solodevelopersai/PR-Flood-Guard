import type {
  AnalysisResult,
  PullRequestContext,
  RiskLevel,
  SuggestedAction,
} from "./types.js";
import { defaultConfig } from "../config/default.js";
import type { PRFloodGuardConfig } from "../config/schema.js";
import { evaluateRules } from "./rules/index.js";
import { clamp } from "../utils/helpers.js";

export function scorePullRequest(
  context: PullRequestContext,
  config: PRFloodGuardConfig = defaultConfig,
  now = new Date(),
): AnalysisResult {
  const triggeredRules = evaluateRules(context, now);
  const score = clamp(
    100 - triggeredRules.reduce((total, rule) => total + rule.impact, 0),
    0,
    100,
  );
  const risk = getRiskLevel(score, config);
  const suggestedAction = getSuggestedAction(risk, config);
  const summary =
    triggeredRules.length === 0
      ? "No configured quality-risk signals were detected."
      : `${triggeredRules.length} quality-risk signal${triggeredRules.length === 1 ? "" : "s"} detected. The score is a review aid, not a judgment about the contributor.`;
  return { score, risk, triggeredRules, suggestedAction, summary };
}

export function getRiskLevel(
  score: number,
  config: PRFloodGuardConfig,
): RiskLevel {
  if (score <= config.thresholds.critical) return "critical";
  if (score <= config.thresholds.high) return "high";
  if (score <= config.thresholds.medium) return "medium";
  return "low";
}

function getSuggestedAction(
  risk: RiskLevel,
  config: PRFloodGuardConfig,
): SuggestedAction {
  if (!config.comment.enabled) {
    const action = config.actions[risk];
    if (action === "comment") return "none";
    if (action === "label+comment") return "label";
    if (action === "quarantine") return "quarantine";
    return action;
  }
  return config.actions[risk];
}
