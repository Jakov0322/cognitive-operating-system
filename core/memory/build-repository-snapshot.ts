import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { RepositorySnapshot } from "../../knowledge/schemas/repository-snapshot";
import { getRepoRoot, knowledgeDir } from "../shared/workspace";

async function latestJsonFile(dir: string): Promise<string> {
  const files = await readdir(dir);

  const latest = files
    .filter((file) => file.endsWith(".json"))
    .sort()
    .reverse()[0];

  if (!latest) {
    throw new Error(`No JSON files found in ${dir}`);
  }

  return join(dir, latest);
}

async function loadJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export function buildRepositorySnapshot(
  input: {
    repositoryName: string;
    modules: unknown[];
    hotspots: unknown[];
    invariants: unknown[];
    timeline: { eventCount?: number }[];
    references: {
      moduleActivity: string;
      hotspots: string;
      invariants: string;
      timeline: string;
    };
  },
  now: string = new Date().toISOString()
): RepositorySnapshot {
  return {
    id: `snapshot.${Date.now()}`,

    createdAt: now,

    metadata: {
      repositoryName: input.repositoryName,
      generatedAt: now,
    },

    summary: {
      modules: input.modules.length,
      hotspots: input.hotspots.length,
      invariants: input.invariants.length,
      events: input.timeline.reduce(
        (sum, item) => sum + (item.eventCount ?? 0),
        0
      ),
    },

    references: input.references,
  };
}

async function main() {
  const moduleActivityFile = await latestJsonFile(
    knowledgeDir("projections", "module-activity")
  );

  const hotspotsFile = await latestJsonFile(
    knowledgeDir("projections", "hotspots")
  );

  const invariantsFile = await latestJsonFile(
    knowledgeDir("projections", "architectural-invariants")
  );

  const timelineFile = await latestJsonFile(
    knowledgeDir("projections", "timeline")
  );

  const modules = await loadJson<any[]>(moduleActivityFile);
  const hotspots = await loadJson<any[]>(hotspotsFile);
  const invariants = await loadJson<any[]>(invariantsFile);
  const timeline = await loadJson<{ eventCount?: number }[]>(timelineFile);

  const snapshot = buildRepositorySnapshot({
    repositoryName: getRepoRoot().split(/[\\/]/).pop() ?? "repository",
    modules,
    hotspots,
    invariants,
    timeline,
    references: {
      moduleActivity: moduleActivityFile,
      hotspots: hotspotsFile,
      invariants: invariantsFile,
      timeline: timelineFile,
    },
  });

  const outputDir = knowledgeDir("snapshots");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(
    outputDir,
    `repository-snapshot-${Date.now()}.json`
  );

  await writeFile(outputPath, JSON.stringify(snapshot, null, 2), "utf8");

  console.log(`Saved repository snapshot to: ${outputPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}