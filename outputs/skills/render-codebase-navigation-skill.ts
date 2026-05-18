import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

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

function renderSkill(modules: ModuleActivityProjection[]): string {
  const knownModules = modules.map((module) => moduleName(module.moduleId));

  const lines: string[] = [];

  lines.push("# Codebase Navigation Skill");
  lines.push("");
  lines.push("## Purpose");
  lines.push("");
  lines.push(
    "Use this skill before adding, moving, or modifying files in this repository."
  );
  lines.push("");

  lines.push("## Known Top-Level Modules");
  lines.push("");

  for (const module of knownModules) {
    lines.push(`- \`${module}/\``);
  }

  lines.push("");
  lines.push("## Placement Rules");
  lines.push("");
  lines.push("- Put data ingestion and external platform clients under `connectors/`.");
  lines.push("- Put transformation, extraction, inference, timeline, and orchestration logic under `core/`.");
  lines.push("- Put schemas, ontology, events, graph data, projections, and durable memory under `knowledge/`.");
  lines.push("- Put generated reports, skills, and agent-facing artifacts under `outputs/`.");
  lines.push("- Do not place generated JSON projections inside `outputs/`.");
  lines.push("- Do not place Markdown reports inside `knowledge/`.");
  lines.push("");

  lines.push("## Current Module Coupling");
  lines.push("");

  for (const module of modules) {
    lines.push(`### ${moduleName(module.moduleId)}`);
    lines.push("");
    lines.push(
      `- Related modules: ${
        module.relatedModules.map(moduleName).join(", ") || "-"
      }`
    );
    lines.push(`- Weighted change count: ${module.changeCount}`);
    lines.push("");
  }

  lines.push("## Agent Guidance");
  lines.push("");
  lines.push("- Before editing `core/`, check architecture and hotspot skills.");
  lines.push("- Before editing `connectors/`, ensure no inference logic leaks into connector code.");
  lines.push("- Before editing `outputs/`, ensure the source of truth remains in `knowledge/` or `core/`.");
  lines.push("- Before editing `knowledge/`, preserve machine-readable schemas and replayability.");
  lines.push("");

  lines.push("## Related Context");
  lines.push("");
  lines.push("- `outputs/skills/architecture/SKILL.md`");
  lines.push("- `outputs/skills/risk-hotspots/SKILL.md`");
  lines.push("- `outputs/reports/module-activity.md`");

  return lines.join("\n");
}

async function main() {
  const root = process.cwd();

  const moduleActivityDir = join(
    root,
    "knowledge",
    "projections",
    "module-activity"
  );

  const latest = await latestJsonFile(moduleActivityDir);
  const raw = await readFile(latest, "utf8");
  const modules = JSON.parse(raw) as ModuleActivityProjection[];

  const outputDir = join(root, "outputs", "skills", "codebase-navigation");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, "SKILL.md");

  await writeFile(outputPath, renderSkill(modules), "utf8");

  console.log(`Saved skill to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});