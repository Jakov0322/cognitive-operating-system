import "dotenv/config";

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { NormalizedEvent } from "../../knowledge/schemas/normalized-event";
import { RawLinearComment, RawLinearIssue } from "./linear-types";
import { knowledgeDir } from "../../core/shared/workspace";

const CLOSED_STATE_TYPES = new Set(["completed", "canceled"]);

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

function normalizeIssue(issue: RawLinearIssue): NormalizedEvent {
  const now = new Date().toISOString();

  const type = CLOSED_STATE_TYPES.has(issue.stateType)
    ? "issue.closed"
    : "issue.created";

  return {
    id: `linear.issue.${issue.identifier}`,
    type,
    source: "linear",

    timestamp: issue.completedAt ?? issue.canceledAt ?? issue.updatedAt ?? issue.createdAt,

    actor: issue.creatorName,
    title: issue.title,
    summary: issue.description ?? "",

    payload: { ...issue },

    evidenceIds: [`evidence.linear.issue.${issue.identifier}`],

    createdAt: now,
  };
}

function normalizeComment(comment: RawLinearComment): NormalizedEvent {
  const now = new Date().toISOString();

  return {
    id: `linear.comment.${comment.id}`,
    type: "comment.created",
    source: "linear",

    timestamp: comment.createdAt,

    actor: comment.authorName,
    summary: comment.body,

    relatedEntities: [`issue.linear.${comment.parentIdentifier}`],

    payload: { ...comment },

    evidenceIds: [`evidence.linear.comment.${comment.id}`],

    createdAt: now,
  };
}

async function main() {
  const rawDir = knowledgeDir("events", "raw", "linear");

  const [issuesFile, commentsFile] = await Promise.all([
    latestFileWithPrefix(rawDir, "issues-"),
    latestFileWithPrefix(rawDir, "comments-"),
  ]);

  const events: NormalizedEvent[] = [];

  if (issuesFile) {
    const issues = await readJson<RawLinearIssue[]>(issuesFile);
    events.push(...issues.map(normalizeIssue));
  }

  if (commentsFile) {
    const comments = await readJson<RawLinearComment[]>(commentsFile);
    events.push(...comments.map(normalizeComment));
  }

  if (events.length === 0) {
    throw new Error(
      "No raw Linear data found. Run `npm run linear:fetch` first."
    );
  }

  const outputDir = knowledgeDir("events", "normalized");
  await mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = join(outputDir, `linear-${timestamp}.json`);

  await writeFile(outputPath, JSON.stringify(events, null, 2), "utf8");

  console.log(`Normalized Linear events: ${events.length}`);
  console.log(`Saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
