import type { TriggeredRule } from "../types.js";
import { DEFAULT_RULE_WEIGHTS } from "../../config/default.js";
import type { PRFloodGuardConfig } from "../../config/schema.js";

const GENERIC_TITLES =
  /^(update|changes?|fix|bug fix|improve|misc|cleanup|patch|wip)(\s+(files?|code|stuff|things?))?[\s.!:]*$/i;

export function titleRules(
  title: string,
  weights: PRFloodGuardConfig["weights"] = DEFAULT_RULE_WEIGHTS,
): TriggeredRule[] {
  const rules: TriggeredRule[] = [];
  const normalized = title.trim();
  if (GENERIC_TITLES.test(normalized)) {
    rules.push({
      name: "generic-title",
      impact: weights.genericTitle,
      message: `The title "${normalized}" does not explain the change.`,
    });
  } else if (normalized.length < 10) {
    rules.push({
      name: "short-title",
      impact: weights.shortTitle,
      message:
        "The title is very short; add enough context to identify the change.",
    });
  }
  return rules;
}
