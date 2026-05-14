export type RawGitCommit = {
  sha: string;
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
  changedFiles: string[];
};

export function parseGitLog(rawLog: string): RawGitCommit[] {
  return rawLog
    .split("\x1e")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const lines = entry.split("\n").filter(Boolean);
      const header = lines[0];

      const [sha, authorName, authorEmail, date, message] = header.split("\x1f");

      const changedFiles = lines.slice(1).map((line) => line.trim()).filter(Boolean);

      return {
        sha,
        authorName,
        authorEmail,
        date,
        message,
        changedFiles,
      };
    });
}