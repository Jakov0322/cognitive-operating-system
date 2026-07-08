import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

import { knowledgeDir, outputsDir } from "../../core/shared/workspace";

type ExpertiseProfile = {
  personId: string;
  strongestModules: {
    moduleId: string;
    score: number;
  }[];
  expertiseAreas: string[];
  ownershipConfidence: {
    score: number;
    level: "low" | "medium" | "high";
  };
  evidenceIds: string[];
  inferredAt: string;
};

async function latestJsonFile(dir: string): Promise<string> {
  const files = await readdir(dir);
  const latest = files.filter((file) => file.endsWith(".json")).sort().reverse()[0];

  if (!latest) {
    throw new Error(`No JSON files found in ${dir}`);
  }

  return join(dir, latest);
}

function entityName(id: string): string {
  return id.replace(/^person\./, "");
}

function moduleName(id: string): string {
  return id.replace(/^module\./, "");
}

function renderMarkdown(profiles: ExpertiseProfile[]): string {
  const lines: string[] = [];

  lines.push("# Expertise Report");
  lines.push("");
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`Tracked people: ${profiles.length}`);
  lines.push("");
  lines.push("| Person | Confidence | Strongest modules | Expertise areas |");
  lines.push("|---|---:|---|---|");

  for (const profile of profiles) {
    lines.push(
      `| ${entityName(profile.personId)} | ${profile.ownershipConfidence.level} (${profile.ownershipConfidence.score}) | ${profile.strongestModules
        .map((item) => `${moduleName(item.moduleId)}:${item.score}`)
        .join(", ") || "-"} | ${profile.expertiseAreas.join(", ") || "-"} |`
    );
  }

  lines.push("");
  lines.push("## Details");
  lines.push("");

  for (const profile of profiles) {
    lines.push(`### ${entityName(profile.personId)}`);
    lines.push("");
    lines.push(`- Ownership confidence: ${profile.ownershipConfidence.level} (${profile.ownershipConfidence.score})`);
    lines.push(`- Expertise areas: ${profile.expertiseAreas.join(", ") || "-"}`);
    lines.push(`- Evidence count: ${profile.evidenceIds.length}`);
    lines.push("");
    lines.push("Strongest modules:");
    lines.push("");

    for (const item of profile.strongestModules) {
      lines.push(`- ${moduleName(item.moduleId)}: ${item.score}`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const expertiseFile = await latestJsonFile(
    knowledgeDir("projections", "expertise")
  );

  const profiles = JSON.parse(
    await readFile(expertiseFile, "utf8")
  ) as ExpertiseProfile[];

  const outputDir = outputsDir("reports");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, "expertise.md");

  await writeFile(outputPath, renderMarkdown(profiles), "utf8");

  console.log(`Saved report to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});