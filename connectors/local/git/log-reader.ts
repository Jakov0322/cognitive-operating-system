export type RawGitCommit = {
  sha: string;
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
  changedFiles: string[];
};

export function parseGitLog(rawLog: string): RawGitCommit[] {
  const commits: RawGitCommit[] = [];

  const entries = rawLog
    .split("\x1e")
    .map((entry) => entry.trim())
    .filter(Boolean);

  for (const entry of entries) {
    const lines = entry
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      continue;
    }

    const header = lines[0];

    const parts = header.split("\x1f");

    if (parts.length < 5) {
      continue;
    }

    const [sha, authorName, authorEmail, date, message] = parts;

    const changedFiles = lines
      .slice(1)
      .filter((line) => {
        return (
          !line.includes("\x1f") &&
          !line.startsWith("commit ")
        );
      });

    commits.push({
      sha,
      authorName,
      authorEmail,
      date,
      message,
      changedFiles,
    });
  }

  return commits;
}