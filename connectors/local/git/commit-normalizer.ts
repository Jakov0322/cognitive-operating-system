import { NormalizedEvent } from "../../../knowledge/schemas/normalized-event";
import { RawGitCommit } from "./log-reader";

export function normalizeCommitToEvent(
  commit: RawGitCommit,
  repository: string
): NormalizedEvent {
  const now = new Date().toISOString();

  return {
    id: `local_git.commit.${commit.sha}`,
    type: "commit.created",
    source: "local_git",

    timestamp: commit.date,

    actor: commit.authorName,
    title: commit.message,
    summary: commit.message,

    repository,
    relatedFiles: commit.changedFiles,

    payload: {
      sha: commit.sha,
      authorName: commit.authorName,
      authorEmail: commit.authorEmail,
      message: commit.message,
      changedFiles: commit.changedFiles,
    },

    evidenceIds: [`evidence.local_git.commit.${commit.sha}`],

    createdAt: now,
  };
}

export function normalizeCommitsToEvents(
  commits: RawGitCommit[],
  repository: string
): NormalizedEvent[] {
  return commits.map((commit) => normalizeCommitToEvent(commit, repository));
}