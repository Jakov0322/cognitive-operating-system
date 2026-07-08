import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

import { knowledgeDir, outputsDir } from "../../core/shared/workspace";

type ModuleActivityProjection = {
  moduleId: string;
  changeCount: number;
  authors: string[];
  relatedModules: string[];
  evidenceIds: string[];
  updatedAt: string;
};

type ModuleHotspot = {
  moduleId: string;
  hotspotScore: number;
  confidence?: {
    score: number;
    level: string;
  };
  reasons: string[];
  metrics: {
    changeCount: number;
    authorCount: number;
    relatedModuleCount: number;
  };
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

function renderSkill(
  modules: ModuleActivityProjection[],
  hotspots: ModuleHotspot[]
): string {
  const activeModules = [...modules].sort((a, b) => b.changeCount - a.changeCount);
  const highRisk = hotspots.filter((h) => h.hotspotScore >= 0.75);

  const lines: string[] = [];

  lines.push("# Onboarding Skill");
  lines.push("");
  lines.push("## Purpose");
  lines.push("");
  lines.push(
    "Use this skill when starting work in this repository or when another agent needs quick project orientation."
  );
  lines.push("");

  lines.push("## Project Mental Model");
  lines.push("");
  lines.push(
    "This project builds a cognitive operating system for software projects. It ingests project signals, converts them into structured memory, derives projections and inferences, then renders agent-facing context."
  );
  lines.push("");

  lines.push("## Main Layers");
  lines.push("");
  lines.push("- `connectors/`: ingestion from local git and external systems.");
  lines.push("- `core/`: normalization, extraction, timeline, inference, and orchestration.");
  lines.push("- `knowledge/`: machine-readable memory, events, graph, projections, ontology, and schemas.");
  lines.push("- `outputs/`: generated reports, skills, and agent-facing context.");
  lines.push("");

  lines.push("## Most Active Modules");
  lines.push("");

  for (const module of activeModules.slice(0, 5)) {
    lines.push(
      `- \`${moduleName(module.moduleId)}/\`: weighted changes ${module.changeCount}, related modules: ${
        module.relatedModules.map(moduleName).join(", ") || "-"
      }`
    );
  }

  lines.push("");

  lines.push("## Current High-Risk Areas");
  lines.push("");

  if (highRisk.length === 0) {
    lines.push("- No high-risk modules currently inferred.");
  } else {
    for (const hotspot of highRisk) {
      lines.push(
        `- \`${moduleName(hotspot.moduleId)}/\`: score ${hotspot.hotspotScore}, confidence ${
          hotspot.confidence?.level ?? "unknown"
        }`
      );
    }
  }

  lines.push("");

  lines.push("## First Files to Read");
  lines.push("");
  lines.push("- `outputs/agent-context/AGENTS.md`");
  lines.push("- `outputs/skills/architecture/SKILL.md`");
  lines.push("- `outputs/skills/codebase-navigation/SKILL.md`");
  lines.push("- `outputs/skills/risk-hotspots/SKILL.md`");
  lines.push("- `outputs/skills/project-timeline/SKILL.md`");
  lines.push("");

  lines.push("## Agent Rules");
  lines.push("");
  lines.push("- Do not start by editing generated JSON files manually.");
  lines.push("- Treat `knowledge/` as machine-readable source memory.");
  lines.push("- Treat `outputs/` as generated consumable context.");
  lines.push("- Add new intelligence as projections or inference before rendering reports.");
  lines.push("- Preserve evidence-backed reasoning.");
  lines.push("");

  lines.push("## Suggested Workflow");
  lines.push("");
  lines.push("1. Run `npm run analyze`.");
  lines.push("2. Read `outputs/agent-context/AGENTS.md`.");
  lines.push("3. Read the relevant skill for the task.");
  lines.push("4. Modify source logic.");
  lines.push("5. Run `npm run analyze` again.");
  lines.push("6. Inspect regenerated reports and skills.");

  return lines.join("\n");
}

async function main() {
  const moduleActivityFile = await latestJsonFile(
    knowledgeDir("projections", "module-activity")
  );

  const hotspotsFile = await latestJsonFile(
    knowledgeDir("projections", "hotspots")
  );

  const modules = JSON.parse(
    await readFile(moduleActivityFile, "utf8")
  ) as ModuleActivityProjection[];

  const hotspots = JSON.parse(
    await readFile(hotspotsFile, "utf8")
  ) as ModuleHotspot[];

  const outputDir = outputsDir("skills", "onboarding");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, "SKILL.md");

  await writeFile(outputPath, renderSkill(modules, hotspots), "utf8");

  console.log(`Saved skill to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});