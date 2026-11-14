import type { PullRequestContext, TriggeredRule } from "../types.js";
import { aiPatternRules } from "./ai-patterns.js";
import { authorRules } from "./author.js";
import { commitRules } from "./commits.js";
import { descriptionRules } from "./description.js";
import { diffRules } from "./diff.js";
import { titleRules } from "./title.js";
import { DEFAULT_RULE_WEIGHTS } from "../../config/default.js";
import type { PRFloodGuardConfig } from "../../config/schema.js";

export function evaluateRules(
  context: PullRequestContext,
  now = new Date(),
  weights: PRFloodGuardConfig["weights"] = DEFAULT_RULE_WEIGHTS,
): TriggeredRule[] {
  return [
    ...titleRules(context.title, weights),
    ...descriptionRules(context.body, context.linkedIssue, weights),
    ...commitRules(context.commits, weights),
    ...diffRules(context, weights),
    ...authorRules(context, now, weights),
    ...aiPatternRules(context, weights),
    ...branchRules(context.branchName, weights),
  ];
}

function branchRules(
  branchName: string,
  weights: PRFloodGuardConfig["weights"],
): TriggeredRule[] {
  if (
    /^(?:update|changes?|fix|patch|wip|tmp|temp)(?:[-/_].*)?$/i.test(
      branchName.trim(),
    )
  ) {
    return [
      {
        name: "generic-branch-name",
        impact: weights.genericBranch,
        message: "The branch name is generic and does not describe the change.",
      },
    ];
  }
  return [];
}
