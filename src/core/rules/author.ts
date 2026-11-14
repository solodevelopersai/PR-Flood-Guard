import type { PullRequestContext, TriggeredRule } from "../types.js";
import { hasLowPublicReputation, isNewAccount } from "../reputation.js";
import { DEFAULT_RULE_WEIGHTS } from "../../config/default.js";
import type { PRFloodGuardConfig } from "../../config/schema.js";

export function authorRules(
  context: PullRequestContext,
  now = new Date(),
  weights: PRFloodGuardConfig["weights"] = DEFAULT_RULE_WEIGHTS,
): TriggeredRule[] {
  const rules: TriggeredRule[] = [];
  const createdAt = context.author.createdAt
    ? new Date(context.author.createdAt)
    : undefined;
  const accountAgeDays =
    createdAt && !Number.isNaN(createdAt.getTime())
      ? Math.floor((now.getTime() - createdAt.getTime()) / 86_400_000)
      : undefined;
  if (isNewAccount(accountAgeDays)) {
    rules.push({
      name: "new-account",
      impact: weights.newAccount,
      message:
        "The author account is less than 30 days old; verify context without assuming intent.",
    });
  }
  const reputationSignals = {
    ...(context.author.previousPullRequests !== undefined
      ? { previousPullRequests: context.author.previousPullRequests }
      : {}),
    ...(context.author.mergedPullRequests !== undefined
      ? { mergedPullRequests: context.author.mergedPullRequests }
      : {}),
  };
  if (hasLowPublicReputation(reputationSignals)) {
    rules.push({
      name: "low-public-merge-rate",
      impact: weights.lowReputation,
      message:
        "Fewer than 20% of the author's sampled PRs in this repository were merged; this limited signal may be incomplete.",
    });
  }
  return rules;
}
