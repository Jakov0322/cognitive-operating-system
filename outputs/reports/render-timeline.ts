import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { outputsDir } from "../../core/shared/workspace";

type TimelineDay = {
  date: string;
  changeCount: number;
  eventCount: number;
  classifications: Record<string, number>;
  modules: string[];
  evidenceIds: string[];
};

function moduleName(moduleId: string): string {
  return moduleId.replace(/^module\./, "");
}

function renderClassifications(classifications: Record<string, number>): string {
  return Object.entries(classifications)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
}

function renderMarkdown(days: TimelineDay[]): string {
  const lines: string[] = [];

  lines.push("# Activity Timeline Report");
  lines.push("");
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push("");

  lines.push("## Summary");
  lines.push("");
  lines.push(`Tracked days: ${days.length}`);
  lines.push("");

  lines.push("| Date | Weighted changes | Events | Modules | Classifications |");
  lines.push("|---|---:|---:|---|---|");

  for (const day of days) {
    lines.push(
      `| ${day.date} | ${day.changeCount} | ${day.eventCount} | ${
        day.modules.map(moduleName).join(", ") || "-"
      } | ${renderClassifications(day.classifications) || "-"} |`
    );
  }

  lines.push("");
  lines.push("## Details");
  lines.push("");

  for (const day of days) {
    lines.push(`### ${day.date}`);
    lines.push("");
    lines.push(`- Weighted changes: ${day.changeCount}`);
    lines.push(`- Events: ${day.eventCount}`);
    lines.push(
      `- Modules touched: ${day.modules.map(moduleName).join(", ") || "-"}`
    );
    lines.push(
      `- Classifications: ${renderClassifications(day.classifications) || "-"}`
    );
    lines.push(`- Evidence count: ${day.evidenceIds.length}`);
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const timelineFile = process.argv[2];

  if (!timelineFile) {
    throw new Error("Provide timeline projection file path as argument");
  }

  const raw = await readFile(timelineFile, "utf8");
  const days = JSON.parse(raw) as TimelineDay[];

  const outputDir = outputsDir("reports");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, "timeline.md");

  await writeFile(outputPath, renderMarkdown(days), "utf8");

  console.log(`Saved report to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});