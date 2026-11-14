import type { TriggeredRule } from "../types.js";
import { DEFAULT_RULE_WEIGHTS } from "../../config/default.js";
import type { PRFloodGuardConfig } from "../../config/schema.js";

const ISSUE_REFERENCE =
  /(?:#\d+|(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#\d+|https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/\d+)/i;

export function descriptionRules(
  body: string | null,
  linkedIssue?: boolean,
  weights: PRFloodGuardConfig["weights"] = DEFAULT_RULE_WEIGHTS,
): TriggeredRule[] {
  const rules: TriggeredRule[] = [];
  const meaningfulText = getMeaningfulDescription(body);
  if (isWeakDescription(body)) {
    rules.push({
      name: "weak-description",
      impact: weights.weakDescription,
      message: "The description is empty or provides very little context.",
    });
  } else if (meaningfulText.length < 60) {
    rules.push({
      name: "short-description",
      impact: weights.shortDescription,
      message:
        "The description is brief; explaining motivation and verification helps review.",
    });
  }
  if (linkedIssue === false && !ISSUE_REFERENCE.test(meaningfulText)) {
    rules.push({
      name: "no-linked-issue",
      impact: weights.noLinkedIssue,
      message: "No linked issue or issue reference was found.",
    });
  }
  return rules;
}

export function isWeakDescription(body: string | null): boolean {
  return getMeaningfulDescription(body).length < 20;
}

function getMeaningfulDescription(body: string | null): string {
  return (body?.trim() ?? "").replace(/<!--[\s\S]*?-->/g, "").trim();
}
