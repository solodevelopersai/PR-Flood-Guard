import type { Octokit } from "@octokit/rest";

export async function convertPullRequestToDraft(
  octokit: Octokit,
  pullRequestNodeId: string,
  isDraft: boolean,
): Promise<void> {
  if (isDraft) return;
  await octokit.graphql(
    `mutation ConvertPullRequestToDraft($pullRequestId: ID!) {
      convertPullRequestToDraft(input: { pullRequestId: $pullRequestId }) {
        pullRequest { isDraft }
      }
    }`,
    { pullRequestId: pullRequestNodeId },
  );
}
