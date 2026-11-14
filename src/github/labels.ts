import type { Octokit } from "@octokit/rest";
import type { AnalysisResult } from "../core/types.js";
import type { PRFloodGuardConfig } from "../config/schema.js";

const LABEL_COLORS = {
  critical: "b60205",
  high: "d93f0b",
  medium: "fbca04",
  low: "0e8a16",
} as const;

export async function syncRiskLabel(
  octokit: Octokit,
  owner: string,
  repo: string,
  issue_number: number,
  result: AnalysisResult,
  config: PRFloodGuardConfig,
): Promise<void> {
  const selectedLabel = config.labels[result.risk];

  try {
    await octokit.rest.issues.createLabel({
      owner,
      repo,
      name: selectedLabel,
      color: LABEL_COLORS[result.risk],
      description: `PRFloodGuard ${result.risk}-risk review signal`,
    });
  } catch (error) {
    if (!isStatus(error, 422)) throw error;
    await octokit.rest.issues.getLabel({ owner, repo, name: selectedLabel });
  }

  await clearRiskLabels(
    octokit,
    owner,
    repo,
    issue_number,
    config,
    selectedLabel,
  );
  await octokit.rest.issues.addLabels({
    owner,
    repo,
    issue_number,
    labels: [selectedLabel],
  });
}

export async function clearRiskLabels(
  octokit: Octokit,
  owner: string,
  repo: string,
  issue_number: number,
  config: PRFloodGuardConfig,
  except?: string,
): Promise<void> {
  const managedLabels = Object.values(config.labels);
  const current = await octokit.rest.issues.listLabelsOnIssue({
    owner,
    repo,
    issue_number,
    per_page: 100,
  });
  const staleLabels = current.data
    .map((label) => label.name)
    .filter((name) => managedLabels.includes(name) && name !== except);
  for (const name of staleLabels) {
    await octokit.rest.issues.removeLabel({ owner, repo, issue_number, name });
  }
}

function isStatus(error: unknown, status: number): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    error.status === status
  );
}
