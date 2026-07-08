import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

import { knowledgeDir, outputsDir } from "../../core/shared/workspace";

type ArchitecturalInvariant = {
  id: string;
  type: string;
  description: string;
  sourceModules: string[];
  targetModules?: string[];
  confidence: {
    score: number;
    level: string;
  };
  evidenceIds: string[];
  metadata?: Record<string, unknown>;
  inferredAt: string;
};

async function latestJsonFile(dir: string): Promise<string> {
  const files = await readdir(dir);
  const latest = files.filter((f) => f.endsWith(".json")).sort().reverse()[0];
  if (!latest) throw new Error(`No JSON files found in ${dir}`);
  return join(dir, latest);
}

function moduleName(id: string): string {
  return id.replace(/^module\./, "");
}

function renderMarkdown(items: ArchitecturalInvariant[]): string {
  const lines: string[] = [];

  lines.push("# Architectural Invariants Report");
  lines.push("");
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`Tracked invariants: ${items.length}`);
  lines.push("");
  lines.push("| Type | Confidence | Description |");
  lines.push("|---|---:|---|");

  for (const item of items) {
    lines.push(
      `| ${item.type} | ${item.confidence.level} (${item.confidence.score}) | ${item.description} |`
    );
  }

  lines.push("");
  lines.push("## Details");
  lines.push("");

  for (const item of items) {
    lines.push(`### ${item.id}`);
    lines.push("");
    lines.push(`- Type: ${item.type}`);
    lines.push(`- Confidence: ${item.confidence.level} (${item.confidence.score})`);
    lines.push(`- Source modules: ${item.sourceModules.map(moduleName).join(", ") || "-"}`);
    lines.push(`- Target modules: ${item.targetModules?.map(moduleName).join(", ") || "-"}`);
    lines.push(`- Description: ${item.description}`);
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const invariantsDir = knowledgeDir("projections", "architectural-invariants");
  const latest = await latestJsonFile(invariantsDir);
  const raw = await readFile(latest, "utf8");
  const items = JSON.parse(raw) as ArchitecturalInvariant[];

  const outputDir = outputsDir("reports");
  await mkdir(outputDir, { recursive: true });

  await writeFile(
    join(outputDir, "architectural-invariants.md"),
    renderMarkdown(items),
    "utf8"
  );

  console.log("Saved report to outputs/reports/architectural-invariants.md");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});