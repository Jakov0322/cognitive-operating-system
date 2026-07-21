import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { outputsDir } from "../../core/shared/workspace";

type SnapshotTrendPoint = {
  snapshotId: string;
  createdAt: string;
  summary: {
    modules: number;
    hotspots: number;
    invariants: number;
    events: number;
  };
  signals: string[];
};

type SnapshotTrend = {
  generatedAt: string;
  points: SnapshotTrendPoint[];
};

const SIGNAL_LABELS: Record<string, string> = {
  hotspot_growth: "Hotspot growth",
  architecture_expansion: "Architecture expansion",
  activity_growth: "Activity growth",
  architecture_maturation: "Architecture maturation",
};

function signalLabel(signal: string): string {
  return SIGNAL_LABELS[signal] ?? signal;
}

export function renderMarkdown(trend: SnapshotTrend): string {
  const lines: string[] = [];

  lines.push("# Snapshot Trend Report");
  lines.push("");
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`Snapshots tracked: ${trend.points.length}`);
  lines.push("");

  lines.push("| Date | Modules | Hotspots | Invariants | Events | Signals |");
  lines.push("|---|---:|---:|---:|---:|---|");

  for (const point of trend.points) {
    lines.push(
      `| ${point.createdAt} | ${point.summary.modules} | ${point.summary.hotspots} | ${point.summary.invariants} | ${point.summary.events} | ${
        point.signals.map(signalLabel).join(", ") || "-"
      } |`
    );
  }

  return lines.join("\n");
}

async function main() {
  const trendFile = process.argv[2];

  if (!trendFile) {
    throw new Error("Provide snapshot trend projection file path as argument");
  }

  const raw = await readFile(trendFile, "utf8");
  const trend = JSON.parse(raw) as SnapshotTrend;

  const outputDir = outputsDir("reports");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, "snapshot-trend.md");

  await writeFile(outputPath, renderMarkdown(trend), "utf8");

  console.log(`Saved report to: ${outputPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
