import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

import { knowledgeDir, outputsDir } from "../../core/shared/workspace";

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

function dominantClassification(day: TimelineDay): string {
  const entries = Object.entries(day.classifications);

  if (entries.length === 0) return "unknown";

  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function renderSkill(days: TimelineDay[]): string {
  const lines: string[] = [];

  lines.push("# Project Timeline Skill");
  lines.push("");
  lines.push("## Purpose");
  lines.push("");
  lines.push(
    "Use this skill when reasoning about project evolution, architectural phases, bootstrap activity, or historical context."
  );
  lines.push("");

  lines.push("## Agent Rules");
  lines.push("");
  lines.push("- Do not treat scaffold/bootstrap commits as strong architectural evidence.");
  lines.push("- Prefer recent evolution events over initial structure when inferring current intent.");
  lines.push("- Use timeline context before explaining why a module appears highly coupled.");
  lines.push("- Distinguish structural setup from real product or architecture evolution.");
  lines.push("");

  lines.push("## Timeline Summary");
  lines.push("");

  for (const day of days) {
    lines.push(`### ${day.date}`);
    lines.push("");
    lines.push(`- Dominant activity: ${dominantClassification(day)}`);
    lines.push(`- Weighted changes: ${day.changeCount}`);
    lines.push(`- Events: ${day.eventCount}`);
    lines.push(
      `- Modules touched: ${day.modules.map(moduleName).join(", ") || "-"}`
    );
    lines.push(
      `- Classifications: ${Object.entries(day.classifications)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")}`
    );
    lines.push(`- Evidence count: ${day.evidenceIds.length}`);
    lines.push("");
  }

  lines.push("## Usage");
  lines.push("");
  lines.push("- Read this before inferring architectural drift.");
  lines.push("- Read this before deciding whether a hotspot is real or bootstrap noise.");
  lines.push("- Read this before generating onboarding or architecture memory.");
  lines.push("");

  lines.push("## Related Context");
  lines.push("");
  lines.push("- `outputs/reports/timeline.md`");
  lines.push("- `outputs/skills/architecture/SKILL.md`");
  lines.push("- `outputs/skills/risk-hotspots/SKILL.md`");

  return lines.join("\n");
}

async function main() {
  const timelineDir = knowledgeDir("projections", "timeline");

  const latest = await latestJsonFile(timelineDir);
  const raw = await readFile(latest, "utf8");
  const days = JSON.parse(raw) as TimelineDay[];

  const outputDir = outputsDir("skills", "project-timeline");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, "SKILL.md");

  await writeFile(outputPath, renderSkill(days), "utf8");

  console.log(`Saved skill to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});