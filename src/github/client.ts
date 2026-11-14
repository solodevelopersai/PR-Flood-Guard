import { Octokit } from "@octokit/rest";

export function createGitHubClient(token: string): Octokit {
  if (!token.trim()) throw new Error("A GitHub token is required.");
  return new Octokit({ auth: token });
}
