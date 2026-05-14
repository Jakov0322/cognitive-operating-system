import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { GitService } from "./git.service";
import { parseGitLog } from "./log-reader";
import { normalizeCommitsToEvents } from "./commit-normalizer";

async function main() {
  const repositoryPath = process.argv[2] ?? process.cwd();

  const git = new GitService(repositoryPath);

  const repository = await git.getRepositoryName();
  const rawLog = await git.log();

  const rawCommits = parseGitLog(rawLog);
  const normalizedEvents = normalizeCommitsToEvents(rawCommits, repository);

  const rootOutputDir = join(repositoryPath, "knowledge", "events");
  const rawOutputDir = join(rootOutputDir, "raw");
  const normalizedOutputDir = join(rootOutputDir, "normalized");

  await mkdir(rawOutputDir, { recursive: true });
  await mkdir(normalizedOutputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  await writeFile(
    join(rawOutputDir, `local-git-${timestamp}.json`),
    JSON.stringify(rawCommits, null, 2),
    "utf8"
  );

  await writeFile(
    join(normalizedOutputDir, `local-git-${timestamp}.json`),
    JSON.stringify(normalizedEvents, null, 2),
    "utf8"
  );

  console.log(`Repository: ${repository}`);
  console.log(`Raw commits: ${rawCommits.length}`);
  console.log(`Normalized events: ${normalizedEvents.length}`);
  console.log(`Saved to: ${rootOutputDir}`);
}

main().catch((error) => {
  console.error("Git scan failed");
  console.error(error);
  process.exit(1);
});