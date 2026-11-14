import * as core from "@actions/core";
import * as github from "@actions/github";
import {
  scorePullRequest,
  generatePullRequestComment,
} from "../../src/index.js";
import type {
  AnalysisResult,
  PullRequestContext,
} from "../../src/core/types.js";
import { createGitHubClient } from "../../src/github/client.js";
import { parseConfig } from "../../src/config/parser.js";
import { defaultConfig } from "../../src/config/default.js";
import { createAnalysisCheck } from "../../src/github/checks.js";
import { clearRiskLabels, syncRiskLabel } from "../../src/github/labels.js";
import { convertPullRequestToDraft } from "../../src/github/quarantine.js";

async function run(): Promise<void> {
  try {
    const context = github.context;
    if (
      context.eventName !== "pull_request" &&
      context.eventName !== "pull_request_target"
    ) {
      throw new Error(
        `PRFloodGuard must run on pull_request or pull_request_target; received "${context.eventName}".`,
      );
    }
    const payload = context.payload.pull_request;
    if (!payload)
      throw new Error("The event payload does not contain a pull request.");

    const token = core.getInput("github-token", { required: true });
    const octokit = createGitHubClient(token);
    const owner = context.repo.owner;
    const repo = context.repo.repo;
    const configPath =
      core.getInput("config-path") || ".github/prfloodguard.yml";
    const config = await getConfig(octokit, owner, repo, configPath);
    if (config.features.reputation) {
      core.warning(
        "features.reputation has no separate Pro behavior; free account-age and repository-history signals remain active.",
      );
    }
    if (config.features.llm_analysis) {
      core.warning(
        "features.llm_analysis is reserved and not implemented; no external model will be called.",
      );
    }

    const pull = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: payload.number,
    });
    const [files, commits, author, linkedIssue] = await Promise.all([
      octokit.paginate(octokit.rest.pulls.listFiles, {
        owner,
        repo,
        pull_number: payload.number,
        per_page: 100,
      }),
      octokit.paginate(octokit.rest.pulls.listCommits, {
        owner,
        repo,
        pull_number: payload.number,
        per_page: 100,
      }),
      getAuthorSignals(
        octokit,
        owner,
        repo,
        pull.data.user?.login ?? payload.user?.login ?? "",
        payload.number,
      ),
      checkLinkedIssue(octokit, owner, repo, payload.number),
    ]);

    const contextForScoring: PullRequestContext = {
      title: pull.data.title,
      body: pull.data.body,
      commits: commits.map(
        (commit) => commit.commit.message.split("\n")[0] ?? "",
      ),
      files: files.map((file) => ({
        filename: file.filename,
        additions: file.additions,
        deletions: file.deletions,
      })),
      author: {
        login: pull.data.user?.login ?? "unknown",
        ...(author.createdAt ? { createdAt: author.createdAt } : {}),
        ...(author.previousPullRequests !== undefined
          ? { previousPullRequests: author.previousPullRequests }
          : {}),
        ...(author.mergedPullRequests !== undefined
          ? { mergedPullRequests: author.mergedPullRequests }
          : {}),
      },
      branchName: pull.data.head.ref,
      additions: pull.data.additions,
      deletions: pull.data.deletions,
      ...(linkedIssue !== undefined ? { linkedIssue } : {}),
      codeCommentText: files
        .map((file) => file.patch ?? "")
        .filter((patch) => patch.length > 0)
        .map((patch) => extractComments(patch)),
    };

    const isWhitelisted = await isAllowlisted(
      octokit,
      contextForScoring.author.login,
      config.whitelist.users,
      config.whitelist.teams,
    );
    const result = isWhitelisted
      ? whitelistedResult()
      : scorePullRequest(contextForScoring, config);

    await createAnalysisCheck(octokit, owner, repo, pull.data.head.sha, result);
    if (isWhitelisted) {
      await clearRiskLabels(octokit, owner, repo, payload.number, config);
      await removeManagedComments(octokit, owner, repo, payload.number);
      core.info(
        `@${contextForScoring.author.login} is allowlisted; no PR actions were applied.`,
      );
      return;
    }

    const action = result.suggestedAction;
    const needsLabel = ["label", "label+comment", "quarantine"].includes(
      action,
    );
    const needsComment =
      config.comment.enabled &&
      ["comment", "label+comment", "quarantine"].includes(action);
    if (needsLabel) {
      await syncRiskLabel(octokit, owner, repo, payload.number, result, config);
    } else {
      await clearRiskLabels(octokit, owner, repo, payload.number, config);
    }
    if (needsComment) {
      await upsertComment(
        octokit,
        owner,
        repo,
        payload.number,
        generatePullRequestComment(result, config),
      );
    } else {
      await removeManagedComments(octokit, owner, repo, payload.number);
    }
    if (action === "quarantine") {
      await convertPullRequestToDraft(
        octokit,
        pull.data.node_id,
        pull.data.draft ?? false,
      );
      core.warning(
        `PR #${payload.number} was converted to draft by configured quarantine policy.`,
      );
    }
    core.info(
      `PR #${payload.number}: ${result.risk} risk, score ${result.score}/100, ${result.triggeredRules.length} signal(s).`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(`PRFloodGuard failed: ${message}`);
  }
}

async function getConfig(
  octokit: ReturnType<typeof createGitHubClient>,
  owner: string,
  repo: string,
  path: string,
) {
  try {
    const response = await octokit.rest.repos.getContent({ owner, repo, path });
    if (Array.isArray(response.data) || response.data.type !== "file") {
      throw new Error(`Config path "${path}" must point to a file.`);
    }
    if (!("content" in response.data)) {
      throw new Error(`GitHub did not return file content for "${path}".`);
    }
    return parseConfig(
      Buffer.from(response.data.content, "base64").toString("utf8"),
    );
  } catch (error) {
    if (statusOf(error) === 404) {
      if (path === ".github/prfloodguard.yml") {
        core.info(`No ${path} found; using built-in defaults.`);
        return defaultConfig;
      }
      throw new Error(`Config file "${path}" was not found.`, { cause: error });
    }
    throw new Error(`Unable to load config at "${path}": ${messageOf(error)}`, {
      cause: error,
    });
  }
}

async function getAuthorSignals(
  octokit: ReturnType<typeof createGitHubClient>,
  owner: string,
  repo: string,
  login: string,
  currentPullNumber: number,
): Promise<{
  createdAt?: string;
  previousPullRequests?: number;
  mergedPullRequests?: number;
}> {
  if (!login) {
    core.warning(
      "Author metadata is unavailable; account reputation signals were skipped.",
    );
    return {};
  }
  try {
    const [user, pullsPage] = await Promise.all([
      octokit.rest.users.getByUsername({ username: login }),
      octokit.rest.pulls.list({
        owner,
        repo,
        state: "all",
        creator: login,
        per_page: 100,
      }),
    ]);
    const pulls = pullsPage.data;
    return {
      createdAt: user.data.created_at,
      previousPullRequests: pulls.filter(
        (pull) => pull.number !== currentPullNumber,
      ).length,
      mergedPullRequests: pulls.filter(
        (pull) => pull.number !== currentPullNumber && pull.merged_at !== null,
      ).length,
    };
  } catch (error) {
    core.warning(
      `Could not retrieve author history for @${login}; reputation signals were skipped: ${messageOf(error)}`,
    );
    return {};
  }
}

async function checkLinkedIssue(
  octokit: ReturnType<typeof createGitHubClient>,
  owner: string,
  repo: string,
  pullNumber: number,
): Promise<boolean | undefined> {
  try {
    const response = await octokit.rest.issues.listEvents({
      owner,
      repo,
      issue_number: pullNumber,
      per_page: 100,
    });
    return response.data.some((event) => event.event === "connected");
  } catch (error) {
    core.warning(`Could not check linked issues: ${messageOf(error)}`);
    return undefined;
  }
}

async function isAllowlisted(
  octokit: ReturnType<typeof createGitHubClient>,
  login: string,
  users: string[],
  teams: string[],
): Promise<boolean> {
  if (users.some((user) => user.toLowerCase() === login.toLowerCase()))
    return true;
  for (const entry of teams) {
    const [org, slug] = entry.split("/");
    try {
      await octokit.request(
        "GET /orgs/{org}/teams/{team_slug}/memberships/{username}",
        {
          org: org!,
          team_slug: slug!,
          username: login,
        },
      );
      return true;
    } catch (error) {
      const status = statusOf(error);
      if (status === 404) continue;
      core.warning(
        `Could not verify team allowlist "${entry}" for @${login}; analysis will continue: ${messageOf(error)}`,
      );
    }
  }
  return false;
}

async function upsertComment(
  octokit: ReturnType<typeof createGitHubClient>,
  owner: string,
  repo: string,
  issue_number: number,
  body: string,
): Promise<void> {
  const existing = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number,
    per_page: 100,
  });
  const previous = existing.find(
    (comment) =>
      comment.user?.type === "Bot" &&
      comment.body?.includes("<!-- prfloodguard:report -->"),
  );
  if (previous) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: previous.id,
      body,
    });
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number,
      body,
    });
  }
}

async function removeManagedComments(
  octokit: ReturnType<typeof createGitHubClient>,
  owner: string,
  repo: string,
  issue_number: number,
): Promise<void> {
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number,
    per_page: 100,
  });
  const managed = comments.filter(
    (comment) =>
      comment.user?.type === "Bot" &&
      comment.body?.includes("<!-- prfloodguard:report -->"),
  );
  for (const comment of managed) {
    await octokit.rest.issues.deleteComment({
      owner,
      repo,
      comment_id: comment.id,
    });
  }
}

function extractComments(patch: string): string {
  return patch
    .split("\n")
    .filter((line) => /^\+[^+]/.test(line))
    .filter((line) => /^\+\s*(?:\/\/|#|\/\*|\*|<!--)/.test(line))
    .join("\n");
}

function whitelistedResult(): AnalysisResult {
  return {
    score: 100,
    risk: "low",
    triggeredRules: [],
    suggestedAction: "none",
    summary: "The author is allowlisted; scoring and PR actions were skipped.",
  };
}

function statusOf(error: unknown): number | undefined {
  return typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
    ? error.status
    : undefined;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

run();
