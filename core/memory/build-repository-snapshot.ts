import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { RepositorySnapshot } from "../../knowledge/schemas/repository-snapshot";

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

async function main() {
  const root = process.cwd();

  const moduleActivityFile = await latestJsonFile(
    join(root, "knowledge", "projections", "module-activity")
  );

  const hotspotsFile = await latestJsonFile(
    join(root, "knowledge", "projections", "hotspots")
  );

  const invariantsFile = await latestJsonFile(
    join(root, "knowledge", "projections", "architectural-invariants")
  );

  const timelineFile = await latestJsonFile(
    join(root, "knowledge", "projections", "timeline")
  );

  const modules = await loadJson<any[]>(moduleActivityFile);
  const hotspots = await loadJson<any[]>(hotspotsFile);
  const invariants = await loadJson<any[]>(invariantsFile);
  const timeline = await loadJson<any[]>(timelineFile);

  const now = new Date().toISOString();

  const snapshot: RepositorySnapshot = {
    id: `snapshot.${Date.now()}`,

    createdAt: now,

    metadata: {
      repositoryName: root.split(/[\\/]/).pop() ?? "repository",
      generatedAt: now,
    },

    summary: {
      modules: modules.length,
      hotspots: hotspots.length,
      invariants: invariants.length,
      events: timeline.reduce(
        (sum, item) => sum + (item.eventCount ?? 0),
        0
      ),
    },

    references: {
      moduleActivity: moduleActivityFile,
      hotspots: hotspotsFile,
      invariants: invariantsFile,
      timeline: timelineFile,
    },
  };

  const outputDir = join(root, "knowledge", "snapshots");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(
    outputDir,
    `repository-snapshot-${Date.now()}.json`
  );

  await writeFile(outputPath, JSON.stringify(snapshot, null, 2), "utf8");

  console.log(`Saved repository snapshot to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});