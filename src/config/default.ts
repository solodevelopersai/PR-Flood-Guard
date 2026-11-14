import type { PRFloodGuardConfig } from "./schema.js";

export const DEFAULT_RULE_WEIGHTS = {
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
};

export const DEFAULT_SCORING = {
  titleCommitPenaltyCap: 25,
};

export const defaultConfig: PRFloodGuardConfig = {
  version: 1,
  thresholds: { critical: 25, high: 40, medium: 65 },
  weights: DEFAULT_RULE_WEIGHTS,
  scoring: DEFAULT_SCORING,
  actions: {
    critical: "label+comment",
    high: "label+comment",
    medium: "label",
    low: "none",
  },
  labels: {
    critical: "prflood:critical",
    high: "prflood:high-risk",
    medium: "prflood:medium-risk",
    low: "prflood:low-risk",
  },
  comment: { enabled: true, style: "professional" },
  whitelist: { users: [], teams: [] },
  features: { reputation: false, llm_analysis: false },
};
