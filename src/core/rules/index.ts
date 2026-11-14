import type { PullRequestContext, TriggeredRule } from "../types.js";
import { aiPatternRules } from "./ai-patterns.js";
import { authorRules } from "./author.js";
import { commitRules } from "./commits.js";
import { descriptionRules } from "./description.js";
import { diffRules } from "./diff.js";
import { titleRules } from "./title.js";
import { RULE_IMPACTS } from "../../utils/constants.js";

export function evaluateRules(
  context: PullRequestContext,
  now = new Date(),
): TriggeredRule[] {
  return [
    ...titleRules(context.title),
    ...descriptionRules(context.body, context.linkedIssue),
    ...commitRules(context.commits),
    ...diffRules(context),
    ...authorRules(context, now),
    ...aiPatternRules(context),
    ...branchRules(context.branchName),
  ];
}

function branchRules(branchName: string): TriggeredRule[] {
  if (
    /^(?:update|changes?|fix|patch|wip|tmp|temp)(?:[-/_].*)?$/i.test(
      branchName.trim(),
    )
  ) {
    return [
      {
        name: "generic-branch-name",
        impact: RULE_IMPACTS.genericBranch,
        message: "The branch name is generic and does not describe the change.",
      },
    ];
  }
  return [];
}
