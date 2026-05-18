import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { ArchitecturalInvariant } from "../../knowledge/schemas/architectural-invariant";

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

function renderSkill(modules: ModuleActivityProjection[],invariants: ArchitecturalInvariant[]): string {
  const sorted = [...modules].sort((a, b) => b.changeCount - a.changeCount);

  const lines: string[] = [];

  lines.push("# Architecture Skill");
  lines.push("");
  lines.push("## Purpose");
  lines.push("");
  lines.push(
    "Use this skill before changing module boundaries, dependency direction, core abstractions, or generated project intelligence outputs."
  );
  lines.push("");

  lines.push("## Current Architectural Layers");
  lines.push("");
  lines.push("- `connectors/`: collects raw signals from local or external systems.");
  lines.push("- `core/`: transforms signals into events, entities, relations, projections, and inference.");
  lines.push("- `knowledge/`: stores machine-readable project memory, schemas, evidence, graph data, and projections.");
  lines.push("- `outputs/`: renders human-facing and agent-facing artifacts.");
  lines.push("");

  lines.push("## Architectural Rules for Agents");
  lines.push("");
  lines.push("- Keep platform-specific API logic inside `connectors/`.");
  lines.push("- Keep normalization, extraction, timeline, and inference logic inside `core/`.");
  lines.push("- Keep durable machine-readable memory inside `knowledge/`.");
  lines.push("- Keep Markdown, report, and skill generation inside `outputs/`.");
  lines.push("- Do not make connectors write final agent-facing context directly.");
  lines.push("- Do not make outputs parse raw external APIs directly.");
  lines.push("- Prefer adding projections before adding narrative reports.");
  lines.push("- Preserve evidence-backed reasoning: every inference should trace back to events, relations, or projections.");
  lines.push("");

  lines.push("## Inferred Architectural Invariants");
  lines.push("");

  for (const invariant of invariants) {
    lines.push(
      `- ${invariant.description} Confidence: ${invariant.confidence.level} (${invariant.confidence.score}).`
    );
  }

  lines.push("");

  lines.push("## Active Modules");
  lines.push("");

  for (const module of sorted) {
    lines.push(`### ${moduleName(module.moduleId)}`);
    lines.push("");
    lines.push(`- Weighted change count: ${module.changeCount}`);
    lines.push(`- Related modules: ${module.relatedModules.map(moduleName).join(", ") || "-"}`);
    lines.push(`- Authors observed: ${module.authors.length}`);
    lines.push(`- Evidence count: ${module.evidenceIds.length}`);
    lines.push("");
  }

  lines.push("## Usage");
  lines.push("");
  lines.push("- Read this skill before moving files across top-level modules.");
  lines.push("- Read this skill before introducing new cross-layer dependencies.");
  lines.push("- Update generated projections before trusting stale architectural summaries.");
  lines.push("");

  lines.push("## Related Context");
  lines.push("");
  lines.push("- `outputs/skills/risk-hotspots/SKILL.md`");
  lines.push("- `outputs/reports/module-activity.md`");
  lines.push("- `outputs/reports/hotspots.md`");
  lines.push("- `outputs/reports/timeline.md`");

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

  const outputDir = join(root, "outputs", "skills", "architecture");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, "SKILL.md");

  const invariantsFile = await latestJsonFile(
    join(root, "knowledge", "projections", "architectural-invariants")
  );

  const invariants = JSON.parse(
    await readFile(invariantsFile, "utf8")
  ) as ArchitecturalInvariant[];

  await writeFile(outputPath, renderSkill(modules, invariants), "utf8");

  console.log(`Saved skill to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});