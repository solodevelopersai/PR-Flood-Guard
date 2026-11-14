import type { PullRequestContext, TriggeredRule } from "../types.js";
import { RULE_IMPACTS } from "../../utils/constants.js";

export function diffRules(context: PullRequestContext): TriggeredRule[] {
  const rules: TriggeredRule[] = [];
  const changedLines = context.additions + context.deletions;
  if (changedLines <= 1 || changedLines > 5_000) {
    rules.push({
      name: "suspicious-diff-size",
      impact: RULE_IMPACTS.suspiciousDiff,
      message:
        changedLines <= 1
          ? "The PR changes at most one line; confirm the change is complete and intentional."
          : `The PR changes ${changedLines.toLocaleString()} lines, which is unusually large and difficult to review.`,
    });
  }
  if (context.files.length > 50) {
    rules.push({
      name: "many-files-changed",
      impact: RULE_IMPACTS.manyFiles,
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
      impact: RULE_IMPACTS.noTests,
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
      impact: RULE_IMPACTS.missingDocs,
      message:
        "Code changed without a documentation update; check whether user-facing docs need revision.",
    });
  }
  return rules;
}
