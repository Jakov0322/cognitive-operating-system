import "dotenv/config";

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { NormalizedEvent } from "../../knowledge/schemas/normalized-event";
import { RawJiraComment, RawJiraIssue } from "./jira-types";

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

function normalizeIssue(issue: RawJiraIssue): NormalizedEvent {
  const now = new Date().toISOString();

  const type = issue.statusCategory === "done" ? "issue.closed" : "issue.created";

  return {
    id: `jira.issue.${issue.key}`,
    type,
    source: "jira",

    timestamp: issue.resolvedAt ?? issue.updatedAt ?? issue.createdAt,

    actor: issue.reporterName,
    title: issue.summary,
    summary: issue.description,

    payload: { ...issue },

    evidenceIds: [`evidence.jira.issue.${issue.key}`],

    createdAt: now,
  };
}

function normalizeComment(comment: RawJiraComment): NormalizedEvent {
  const now = new Date().toISOString();

  return {
    id: `jira.comment.${comment.id}`,
    type: "comment.created",
    source: "jira",

    timestamp: comment.createdAt,

    actor: comment.authorName,
    summary: comment.body,

    relatedEntities: [`issue.jira.${comment.parentKey}`],

    payload: { ...comment },

    evidenceIds: [`evidence.jira.comment.${comment.id}`],

    createdAt: now,
  };
}

async function main() {
  const repositoryPath = process.cwd();
  const rawDir = join(repositoryPath, "knowledge", "events", "raw", "jira");

  const [issuesFile, commentsFile] = await Promise.all([
    latestFileWithPrefix(rawDir, "issues-"),
    latestFileWithPrefix(rawDir, "comments-"),
  ]);

  const events: NormalizedEvent[] = [];

  if (issuesFile) {
    const issues = await readJson<RawJiraIssue[]>(issuesFile);
    events.push(...issues.map(normalizeIssue));
  }

  if (commentsFile) {
    const comments = await readJson<RawJiraComment[]>(commentsFile);
    events.push(...comments.map(normalizeComment));
  }

  if (events.length === 0) {
    throw new Error(
      "No raw Jira data found. Run `npm run jira:fetch` first."
    );
  }

  const outputDir = join(repositoryPath, "knowledge", "events", "normalized");
  await mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = join(outputDir, `jira-${timestamp}.json`);

  await writeFile(outputPath, JSON.stringify(events, null, 2), "utf8");

  console.log(`Normalized Jira events: ${events.length}`);
  console.log(`Saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
