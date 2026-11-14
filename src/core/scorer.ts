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
  const triggeredRules = capTitleCommitPenalty(
    evaluateRules(context, now, config.weights),
    config.scoring.titleCommitPenaltyCap,
  );
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

function capTitleCommitPenalty(
  rules: AnalysisResult["triggeredRules"],
  cap: number,
): AnalysisResult["triggeredRules"] {
  const titleRule = rules.find((rule) => rule.name === "generic-title");
  const commitRule = rules.find((rule) => rule.name === "weak-commit-messages");
  if (
    !titleRule ||
    !commitRule ||
    titleRule.impact + commitRule.impact <= cap
  ) {
    return rules;
  }

  const titleImpact = Math.min(titleRule.impact, cap);
  const commitImpact = Math.min(commitRule.impact, cap - titleImpact);
  return rules.map((rule) => {
    if (rule === titleRule) return { ...rule, impact: titleImpact };
    if (rule === commitRule) return { ...rule, impact: commitImpact };
    return rule;
  });
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
