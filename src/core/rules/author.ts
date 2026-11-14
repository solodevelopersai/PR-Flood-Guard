import type { PullRequestContext, TriggeredRule } from "../types.js";
import { hasLowPublicReputation, isNewAccount } from "../reputation.js";
import { RULE_IMPACTS } from "../../utils/constants.js";

export function authorRules(
  context: PullRequestContext,
  now = new Date(),
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
      impact: RULE_IMPACTS.newAccount,
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
      impact: RULE_IMPACTS.lowReputation,
      message:
        "Fewer than 20% of the author's sampled PRs in this repository were merged; this limited signal may be incomplete.",
    });
  }
  return rules;
}
