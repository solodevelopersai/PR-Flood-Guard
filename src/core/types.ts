export type RiskLevel = "low" | "medium" | "high" | "critical";
export type SuggestedAction =
  "none" | "label" | "comment" | "label+comment" | "quarantine";

export interface TriggeredRule {
  name: string;
  impact: number;
  message: string;
}

export interface PullRequestContext {
  title: string;
  body: string | null;
  commits: string[];
  files: Array<{ filename: string; additions: number; deletions: number }>;
  author: {
    login: string;
    createdAt?: string;
    previousPullRequests?: number;
    mergedPullRequests?: number;
  };
  branchName: string;
  additions: number;
  deletions: number;
  linkedIssue?: boolean;
  codeCommentText?: string[];
}

export interface AnalysisResult {
  score: number;
  risk: RiskLevel;
  triggeredRules: TriggeredRule[];
  suggestedAction: SuggestedAction;
  summary: string;
}
