import type { TriggeredRule } from "../types.js";
import { RULE_IMPACTS } from "../../utils/constants.js";

const ISSUE_REFERENCE =
  /(?:#\d+|(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#\d+|https?:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/\d+)/i;

export function descriptionRules(
  body: string | null,
  linkedIssue?: boolean,
): TriggeredRule[] {
  const rules: TriggeredRule[] = [];
  const text = body?.trim() ?? "";
  const meaningfulText = text.replace(/<!--[\s\S]*?-->/g, "").trim();
  if (meaningfulText.length < 20) {
    rules.push({
      name: "weak-description",
      impact: RULE_IMPACTS.weakDescription,
      message: "The description is empty or provides very little context.",
    });
  } else if (meaningfulText.length < 60) {
    rules.push({
      name: "short-description",
      impact: RULE_IMPACTS.shortDescription,
      message:
        "The description is brief; explaining motivation and verification helps review.",
    });
  }
  if (linkedIssue === false && !ISSUE_REFERENCE.test(meaningfulText)) {
    rules.push({
      name: "no-linked-issue",
      impact: RULE_IMPACTS.noLinkedIssue,
      message: "No linked issue or issue reference was found.",
    });
  }
  return rules;
}
