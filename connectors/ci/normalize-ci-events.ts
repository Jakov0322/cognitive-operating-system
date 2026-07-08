import "dotenv/config";

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { NormalizedEvent, NormalizedEventType } from "../../knowledge/schemas/normalized-event";
import { RawCIRun } from "./ci-types";
import { knowledgeDir } from "../../core/shared/workspace";

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

function runType(run: RawCIRun): NormalizedEventType {
  if (run.status !== "completed") return "ci.started";

  return run.conclusion === "success" ? "ci.passed" : "ci.failed";
}

function normalizeRun(run: RawCIRun, repository: string): NormalizedEvent {
  const now = new Date().toISOString();

  return {
    id: `ci.run.${run.id}`,
    type: runType(run),
    source: "ci",

    timestamp: run.updatedAt ?? run.runStartedAt ?? run.createdAt,

    actor: run.actorLogin,
    title: run.name,
    summary: `${run.status}${run.conclusion ? ` (${run.conclusion})` : ""} on ${run.headBranch}`,

    repository,
    branch: run.headBranch,

    payload: { ...run },

    evidenceIds: [`evidence.ci.run.${run.id}`],

    createdAt: now,
  };
}

async function main() {
  const rawDir = knowledgeDir("events", "raw", "ci");

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  if (!owner || !repo) {
    throw new Error("Missing GITHUB_OWNER or GITHUB_REPO in environment");
  }

  const repository = `${owner}/${repo}`;

  const runsFile = await latestFileWithPrefix(rawDir, "runs-");

  const events: NormalizedEvent[] = [];

  if (runsFile) {
    const runs = await readJson<RawCIRun[]>(runsFile);
    events.push(...runs.map((run) => normalizeRun(run, repository)));
  }

  if (events.length === 0) {
    throw new Error("No raw CI data found. Run `npm run ci:fetch` first.");
  }

  const outputDir = knowledgeDir("events", "normalized");
  await mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = join(outputDir, `ci-${timestamp}.json`);

  await writeFile(outputPath, JSON.stringify(events, null, 2), "utf8");

  console.log(`Normalized CI events: ${events.length}`);
  console.log(`Saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
