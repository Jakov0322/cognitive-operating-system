import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

import { GitService } from "./git.service";
import { parseGitLog } from "./log-reader";
import { normalizeCommitsToEvents } from "./commit-normalizer";
import { readScanCursor, writeScanCursor } from "./scan-cursor";
import { getRepoRoot, knowledgeDir } from "../../../core/shared/workspace";

export type ScanGitArgs = {
  since?: string;
  full: boolean;
  repositoryPath?: string;
};

export function parseArgs(argv: string[]): ScanGitArgs {
  let since: string | undefined;
  let full = false;
  const rest: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--since") {
      since = argv[++i];
    } else if (argv[i] === "--full") {
      full = true;
    } else {
      rest.push(argv[i]);
    }
  }

  return { since, full, repositoryPath: rest[0] };
}

async function main() {
  const { since, full, repositoryPath } = parseArgs(process.argv.slice(2));

  const git = new GitService(repositoryPath ?? getRepoRoot());

  const repository = await git.getRepositoryName();

  let effectiveSince = since;

  if (!effectiveSince && !full) {
    const cursor = await readScanCursor();

    if (cursor && (await git.refExists(cursor.lastScannedSha))) {
      effectiveSince = cursor.lastScannedSha;
    }
  }

  const rawLog = await git.log(effectiveSince);

  const rawCommits = parseGitLog(rawLog);
  const normalizedEvents = normalizeCommitsToEvents(rawCommits, repository);

  const rootOutputDir = knowledgeDir("events");
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

  const headSha = await git.getHeadSha();
  await writeScanCursor(headSha);

  console.log(
    `Scan mode: ${effectiveSince ? `incremental since ${effectiveSince.slice(0, 7)}` : "full"}`
  );
  console.log(`Repository: ${repository}`);
  console.log(`Raw commits: ${rawCommits.length}`);
  console.log(`Normalized events: ${normalizedEvents.length}`);
  console.log(`Saved to: ${rootOutputDir}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("Git scan failed");
    console.error(error);
    process.exit(1);
  });
}