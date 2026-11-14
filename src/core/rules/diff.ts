import type { PullRequestContext, TriggeredRule } from "../types.js";
import { DEFAULT_RULE_WEIGHTS } from "../../config/default.js";
import type { PRFloodGuardConfig } from "../../config/schema.js";
import { isWeakDescription } from "./description.js";

const TYPO_FIX_PATTERN =
  /\b(?:fix|correct|repair|resolve)\b.{0,30}\b(?:typo|spelling|misspell\w*|grammar)\b|\b(?:typo|spelling|misspell\w*|grammar)\b.{0,30}\b(?:fix|correct|repair|resolve)\b/i;

export function diffRules(
  context: PullRequestContext,
  weights: PRFloodGuardConfig["weights"] = DEFAULT_RULE_WEIGHTS,
): TriggeredRule[] {
  const rules: TriggeredRule[] = [];
  const changedLines = context.additions + context.deletions;
  const isTinyDiff = changedLines <= 5;
  const isDocsOnly =
    context.files.length > 0 &&
    context.files.every(
      (file) =>
        /(?:^|[/\\])docs?[/\\]/i.test(file.filename) ||
        /\.(?:md|txt)$/i.test(file.filename),
    );
  const looksLikeTypoFix = TYPO_FIX_PATTERN.test(
    [context.title, context.body ?? "", ...context.commits].join("\n"),
  );
  if (
    (isTinyDiff &&
      !isDocsOnly &&
      !looksLikeTypoFix &&
      isWeakDescription(context.body)) ||
    changedLines > 5_000
  ) {
    rules.push({
      name: "suspicious-diff-size",
      impact: weights.suspiciousDiff,
      message: isTinyDiff
        ? "The PR changes very few lines and has a weak description; confirm the change is complete and intentional."
        : `The PR changes ${changedLines.toLocaleString()} lines, which is unusually large and difficult to review.`,
    });
  }
  if (context.files.length > 50) {
    rules.push({
      name: "many-files-changed",
      impact: weights.manyFiles,
      message: `${context.files.length} files changed; consider splitting unrelated changes.`,
    });
  }
  const hasTests = context.files.some((file) =>
    /(^|[/\\])(__tests__|tests?|spec)([/\\.]|$)|\.(test|spec)\.[cm]?[jt]sx?$/i.test(
      file.filename,
    ),
  );
  const hasProductionCode = context.files.some(
    (file) =>
      /\.(?:[cm]?[jt]sx?|py|go|rs|java|rb|php|cs|swift)$/i.test(
        file.filename,
      ) && !/\.(?:test|spec)\.[cm]?[jt]sx?$/i.test(file.filename),
  );
  if (hasProductionCode && !hasTests) {
    rules.push({
      name: "no-tests-changed",
      impact: weights.noTests,
      message:
        "Production code changed without a test file; consider adding or updating tests.",
    });
  }

  const changesCode = context.files.some((file) =>
    /\.(?:[cm]?[jt]sx?|py|go|rs|java|rb|php|cs|swift)$/i.test(file.filename),
  );
  const changesDocs = context.files.some((file) =>
    /(^|[/\\])(?:docs?([/\\])|[^/\\]+\.(?:md|mdx|rst|adoc)$)|(?:README|CHANGELOG)/i.test(
      file.filename,
    ),
  );
  if (changesCode && !changesDocs) {
    rules.push({
      name: "no-docs-changed",
      impact: weights.missingDocs,
      message:
        "Code changed without a documentation update; check whether user-facing docs need revision.",
    });
  }
  return rules;
}
