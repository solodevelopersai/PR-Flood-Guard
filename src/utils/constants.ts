export const RULE_IMPACTS = {
  genericTitle: 20,
  shortTitle: 8,
  weakDescription: 12,
  shortDescription: 6,
  noLinkedIssue: 4,
  weakCommit: 12,
  suspiciousDiff: 12,
  manyFiles: 8,
  noTests: 8,
  newAccount: 10,
  lowReputation: 8,
  aiPattern: 8,
  genericBranch: 6,
  missingDocs: 5,
} as const;

export const MAX_ANALYZED_COMMENT_CHARS = 100_000;
