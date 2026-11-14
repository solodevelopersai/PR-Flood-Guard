import type { TriggeredRule } from "../types.js";
import { DEFAULT_RULE_WEIGHTS } from "../../config/default.js";
import type { PRFloodGuardConfig } from "../../config/schema.js";

const GENERIC_COMMIT =
  /^(update|changes?|fix|misc|wip|initial commit|commit|work in progress)(\s+.*)?$/i;

export function commitRules(
  messages: string[],
  weights: PRFloodGuardConfig["weights"] = DEFAULT_RULE_WEIGHTS,
): TriggeredRule[] {
  if (messages.length === 0) return [];
  const genericCount = messages.filter((message) =>
    GENERIC_COMMIT.test(message.trim()),
  ).length;
  if (genericCount === 0 || genericCount < Math.ceil(messages.length / 2))
    return [];
  return [
    {
      name: "weak-commit-messages",
      impact: weights.weakCommit,
      message: `${genericCount} of ${messages.length} commit message(s) are generic or uninformative.`,
    },
  ];
}
