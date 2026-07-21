import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { SnapshotDiff } from "../../knowledge/schemas/snapshot-diff";
import { knowledgeDir } from "../shared/workspace";

export type RepositorySnapshot = {
  id: string;

  summary: {
    modules: number;
    hotspots: number;
    invariants: number;
    events: number;
  };
};

async function latestSnapshots(dir: string): Promise<[string, string]> {
  const files = (await readdir(dir))
    .filter((file) => file.endsWith(".json"))
    .sort()
    .reverse();

  if (files.length < 2) {
    throw new Error("Need at least two snapshots");
  }

  return [join(dir, files[1]), join(dir, files[0])];
}

async function loadJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

export function inferSignals(
  previous: RepositorySnapshot,
  current: RepositorySnapshot
): string[] {
  const signals: string[] = [];

  if (current.summary.hotspots > previous.summary.hotspots) {
    signals.push("hotspot_growth");
  }

  if (current.summary.modules > previous.summary.modules) {
    signals.push("architecture_expansion");
  }

  if (current.summary.events > previous.summary.events) {
    signals.push("activity_growth");
  }

  if (current.summary.invariants > previous.summary.invariants) {
    signals.push("architecture_maturation");
  }

  return signals;
}

export function buildSnapshotDiff(
  previous: RepositorySnapshot,
  current: RepositorySnapshot,
  now: string = new Date().toISOString()
): SnapshotDiff {
  return {
    id: `snapshot-diff.${Date.now()}`,

    createdAt: now,

    snapshots: {
      previous: previous.id,
      current: current.id,
    },

    changes: {
      moduleCountDelta:
        current.summary.modules - previous.summary.modules,

      hotspotCountDelta:
        current.summary.hotspots - previous.summary.hotspots,

      invariantCountDelta:
        current.summary.invariants - previous.summary.invariants,

      eventCountDelta:
        current.summary.events - previous.summary.events,
    },

    signals: inferSignals(previous, current),
  };
}

async function main() {
  const snapshotDir = knowledgeDir("snapshots");

  const [previousPath, currentPath] = await latestSnapshots(snapshotDir);

  const previous = await loadJson<RepositorySnapshot>(previousPath);
  const current = await loadJson<RepositorySnapshot>(currentPath);

  const diff = buildSnapshotDiff(previous, current);

  const outputDir = knowledgeDir("projections", "snapshot-diffs");

  await mkdir(outputDir, { recursive: true });

  const outputPath = join(
    outputDir,
    `snapshot-diff-${Date.now()}.json`
  );

  await writeFile(outputPath, JSON.stringify(diff, null, 2), "utf8");

  console.log(`Saved snapshot diff to: ${outputPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}