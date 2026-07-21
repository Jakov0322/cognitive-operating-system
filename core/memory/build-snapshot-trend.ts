import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { allJsonFiles, knowledgeDir } from "../shared/workspace";
import { inferSignals, RepositorySnapshot } from "./compare-snapshots";

export type SnapshotTrendPoint = {
  snapshotId: string;
  createdAt: string;
  summary: RepositorySnapshot["summary"];
  signals: string[];
};

export type SnapshotTrend = {
  generatedAt: string;
  points: SnapshotTrendPoint[];
};

type TimestampedSnapshot = RepositorySnapshot & { createdAt: string };

export function buildSnapshotTrend(
  snapshots: TimestampedSnapshot[],
  now: string = new Date().toISOString()
): SnapshotTrend {
  const sorted = [...snapshots].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const points: SnapshotTrendPoint[] = sorted.map((snapshot, index) => {
    const previous = sorted[index - 1];

    return {
      snapshotId: snapshot.id,
      createdAt: snapshot.createdAt,
      summary: snapshot.summary,
      signals: previous ? inferSignals(previous, snapshot) : [],
    };
  });

  return { generatedAt: now, points };
}

async function main() {
  const files = await allJsonFiles(knowledgeDir("snapshots"));

  if (files.length === 0) {
    throw new Error("No repository snapshots found. Run `cognitive-os analyze` at least once first.");
  }

  const snapshots = await Promise.all(
    files.map(async (file) => JSON.parse(await readFile(file, "utf8")) as TimestampedSnapshot)
  );

  const trend = buildSnapshotTrend(snapshots);

  const outputDir = knowledgeDir("projections", "snapshot-trend");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, `snapshot-trend-${Date.now()}.json`);

  await writeFile(outputPath, JSON.stringify(trend, null, 2), "utf8");

  console.log(`Snapshot trend points: ${trend.points.length}`);
  console.log(`Saved to: ${outputPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
