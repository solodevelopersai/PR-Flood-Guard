import type { PullRequestContext, TriggeredRule } from "../types.js";
import {
  MAX_ANALYZED_COMMENT_CHARS,
  RULE_IMPACTS,
} from "../../utils/constants.js";

const AI_STYLE_PATTERNS = [
  /\b(as an ai|as a language model)\b/i,
  /\b(i hope this (?:helps|is helpful))\b/i,
  /\b(let me know if you (?:need|have) any (?:questions|further assistance))\b/i,
  /\b(in conclusion|in summary)\b/i,
  /\b(comprehensive (?:solution|implementation))\b/i,
];

export function aiPatternRules(context: PullRequestContext): TriggeredRule[] {
  const text = [context.body ?? "", ...(context.codeCommentText ?? [])]
    .join("\n")
    .slice(0, MAX_ANALYZED_COMMENT_CHARS);
  const matches = AI_STYLE_PATTERNS.filter((pattern) =>
    pattern.test(text),
  ).length;
  if (matches === 0) return [];
  return [
    {
      name: "ai-style-language",
      impact: RULE_IMPACTS.aiPattern,
      message:
        "Some phrasing resembles common AI-generated boilerplate; this is not evidence of AI authorship.",
    },
  ];
}
