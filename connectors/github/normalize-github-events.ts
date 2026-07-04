import "dotenv/config";

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { NormalizedEvent } from "../../knowledge/schemas/normalized-event";
import {
  RawGitHubComment,
  RawGitHubIssue,
  RawGitHubPullRequest,
} from "./github-types";

async function latestFileWithPrefix(
  dir: string,
  prefix: string
): Promise<string | null> {
  let files: string[];

  try {
    files = await readdir(dir);
  } catch {
    return null;
  }

  const matched = files
    .filter((file) => file.startsWith(prefix) && file.endsWith(".json"))
    .sort()
    .reverse();

  return matched.length > 0 ? join(dir, matched[0]) : null;
}

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

function normalizePullRequest(
  pr: RawGitHubPullRequest,
  repository: string
): NormalizedEvent {
  const now = new Date().toISOString();

  const type = pr.merged
    ? "pull_request.merged"
    : pr.state === "closed"
    ? "pull_request.closed"
    : "pull_request.opened";

  return {
    id: `github.pull_request.${pr.number}`,
    type,
    source: "github",

    timestamp: pr.mergedAt ?? pr.closedAt ?? pr.updatedAt ?? pr.createdAt,

    actor: pr.authorLogin,
    title: pr.title,
    summary: pr.body ?? "",

    repository,

    payload: { ...pr },

    evidenceIds: [`evidence.github.pull_request.${pr.number}`],

    createdAt: now,
  };
}

function normalizeIssue(
  issue: RawGitHubIssue,
  repository: string
): NormalizedEvent {
  const now = new Date().toISOString();

  const type = issue.state === "closed" ? "issue.closed" : "issue.created";

  return {
    id: `github.issue.${issue.number}`,
    type,
    source: "github",

    timestamp: issue.closedAt ?? issue.updatedAt ?? issue.createdAt,

    actor: issue.authorLogin,
    title: issue.title,
    summary: issue.body ?? "",

    repository,

    payload: { ...issue },

    evidenceIds: [`evidence.github.issue.${issue.number}`],

    createdAt: now,
  };
}

function normalizeComment(
  comment: RawGitHubComment,
  repository: string
): NormalizedEvent {
  const now = new Date().toISOString();

  const parentEntityId =
    comment.parentType === "issue"
      ? `issue.${comment.parentNumber}`
      : `pull_request.${comment.parentNumber}`;

  return {
    id: `github.comment.${comment.id}`,
    type: "comment.created",
    source: "github",

    timestamp: comment.createdAt,

    actor: comment.authorLogin,
    summary: comment.body,

    repository,
    relatedEntities: [parentEntityId],

    payload: { ...comment },

    evidenceIds: [`evidence.github.comment.${comment.id}`],

    createdAt: now,
  };
}

async function main() {
  const repositoryPath = process.cwd();
  const rawDir = join(repositoryPath, "knowledge", "events", "raw", "github");

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!owner || !repo) {
    throw new Error("Missing GITHUB_OWNER or GITHUB_REPO in environment");
  }

  const repository = `${owner}/${repo}`;

  const [pullRequestsFile, issuesFile, commentsFile] = await Promise.all([
    latestFileWithPrefix(rawDir, "pull-requests-"),
    latestFileWithPrefix(rawDir, "issues-"),
    latestFileWithPrefix(rawDir, "comments-"),
  ]);

  const events: NormalizedEvent[] = [];

  if (pullRequestsFile) {
    const pullRequests = await readJson<RawGitHubPullRequest[]>(
      pullRequestsFile
    );

    events.push(
      ...pullRequests.map((pr) => normalizePullRequest(pr, repository))
    );
  }

  if (issuesFile) {
    const issues = await readJson<
      Array<RawGitHubIssue & { pull_request?: unknown }>
    >(issuesFile);

    events.push(
      ...issues
        .filter((issue) => !issue.pull_request)
        .map((issue) => normalizeIssue(issue, repository))
    );
  }

  if (commentsFile) {
    const comments = await readJson<RawGitHubComment[]>(commentsFile);

    events.push(...comments.map((comment) => normalizeComment(comment, repository)));
  }

  if (events.length === 0) {
    throw new Error(
      "No raw GitHub data found. Run `npm run github:fetch` first."
    );
  }

  const outputDir = join(repositoryPath, "knowledge", "events", "normalized");
  await mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = join(outputDir, `github-${timestamp}.json`);

  await writeFile(outputPath, JSON.stringify(events, null, 2), "utf8");

  console.log(`Normalized GitHub events: ${events.length}`);
  console.log(`Saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
