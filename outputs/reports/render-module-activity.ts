import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { outputsDir } from "../../core/shared/workspace";

type ModuleActivityProjection = {
  moduleId: string;
  changeCount: number;
  authors: string[];
  relatedModules: string[];
  evidenceIds: string[];
  updatedAt: string;
};

function moduleName(moduleId: string): string {
  return moduleId.replace(/^module\./, "");
}

function renderMarkdown(items: ModuleActivityProjection[]): string {
  const lines: string[] = [];

  lines.push("# Module Activity Report");
  lines.push("");
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`Tracked modules: ${items.length}`);
  lines.push("");

  lines.push("| Module | Changes | Authors | Related modules |");
  lines.push("|---|---:|---:|---|");

  for (const item of items) {
    lines.push(
      `| ${moduleName(item.moduleId)} | ${item.changeCount} | ${
        item.authors.length
      } | ${item.relatedModules.map(moduleName).join(", ") || "-"} |`
    );
  }

  lines.push("");
  lines.push("## Details");
  lines.push("");

  for (const item of items) {
    lines.push(`### ${moduleName(item.moduleId)}`);
    lines.push("");
    lines.push(`- Change count: ${item.changeCount}`);
    lines.push(`- Authors: ${item.authors.join(", ") || "-"}`);
    lines.push(
      `- Related modules: ${
        item.relatedModules.map(moduleName).join(", ") || "-"
      }`
    );
    lines.push(`- Evidence count: ${item.evidenceIds.length}`);
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const projectionFile = process.argv[2];

  if (!projectionFile) {
    throw new Error("Provide module activity projection file path as argument");
  }

  const raw = await readFile(projectionFile, "utf8");
  const items = JSON.parse(raw) as ModuleActivityProjection[];

  const outputDir = outputsDir("reports");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, "module-activity.md");

  await writeFile(outputPath, renderMarkdown(items), "utf8");

  console.log(`Saved report to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});