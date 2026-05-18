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

type TimelineDay = {
  date: string;
  changeCount: number;
  eventCount: number;
  classifications: Record<string, number>;
  modules: string[];
  evidenceIds: string[];
};

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

async function readLatestJson<T>(dir: string): Promise<T> {
  const file = await latestJsonFile(dir);
  const raw = await readFile(file, "utf8");

  return JSON.parse(raw) as T;
}

function moduleId(input: string): string {
  if (input.startsWith("module.")) return input;
  return `module.${input}`;
}

function moduleName(id: string): string {
  return id.replace(/^module\./, "");
}

function riskLevel(score: number): string {
  if (score >= 0.75) return "HIGH";
  if (score >= 0.45) return "MEDIUM";
  return "LOW";
}

function reasonLabel(reason: string): string {
  return reason.replace(/_/g, " ");
}

function renderContextPack(params: {
  targetModule: string;
  modules: ModuleActivityProjection[];
  hotspots: ModuleHotspot[];
  timeline: TimelineDay[];
}): string {
  const targetModuleId = moduleId(params.targetModule);

  const activity = params.modules.find((module) => module.moduleId === targetModuleId);
  const hotspot = params.hotspots.find((item) => item.moduleId === targetModuleId);

  const relatedModuleIds = new Set<string>(activity?.relatedModules ?? []);

  const relatedActivities = params.modules.filter((module) =>
    relatedModuleIds.has(module.moduleId)
  );

  const relatedHotspots = params.hotspots.filter((item) =>
    relatedModuleIds.has(item.moduleId)
  );

  const relevantTimeline = params.timeline.filter((day) =>
    day.modules.includes(targetModuleId)
  );

  const lines: string[] = [];

  lines.push(`# Context Pack: ${moduleName(targetModuleId)}`);
  lines.push("");
  lines.push("## Purpose");
  lines.push("");
  lines.push(
    `This context pack is optimized for agents working on \`${moduleName(
      targetModuleId
    )}/\`.`
  );
  lines.push("");
  lines.push("It combines relevant architecture, risk, activity, coupling, and timeline context.");
  lines.push("");

  lines.push("## Required Reading");
  lines.push("");
  lines.push("- `outputs/agent-context/AGENTS.md`");
  lines.push("- `outputs/skills/INDEX.md`");
  lines.push("- `outputs/skills/architecture/SKILL.md`");
  lines.push("- `outputs/skills/codebase-navigation/SKILL.md`");
  lines.push("- `outputs/skills/risk-hotspots/SKILL.md`");
  lines.push("- `outputs/skills/project-timeline/SKILL.md`");
  lines.push("- `outputs/reports/architectural-invariants.md`");
  lines.push("");

  lines.push("## Module Summary");
  lines.push("");

  if (!activity) {
    lines.push(`No module activity projection found for \`${targetModuleId}\`.`);
  } else {
    lines.push(`- Module: \`${moduleName(activity.moduleId)}/\``);
    lines.push(`- Weighted change count: ${activity.changeCount}`);
    lines.push(`- Authors observed: ${activity.authors.length}`);
    lines.push(
      `- Related modules: ${
        activity.relatedModules.map(moduleName).join(", ") || "-"
      }`
    );
    lines.push(`- Evidence count: ${activity.evidenceIds.length}`);
  }

  lines.push("");

  lines.push("## Risk Context");
  lines.push("");

  if (!hotspot) {
    lines.push("- No hotspot inference found for this module.");
  } else {
    lines.push(`- Risk: ${riskLevel(hotspot.hotspotScore)}`);
    lines.push(`- Hotspot score: ${hotspot.hotspotScore}`);

    if (hotspot.confidence) {
      lines.push(
        `- Confidence: ${hotspot.confidence.level} (${hotspot.confidence.score})`
      );
    }

    lines.push(
      `- Reasons: ${hotspot.reasons.map(reasonLabel).join(", ") || "-"}`
    );
    lines.push(`- Change count: ${hotspot.metrics.changeCount}`);
    lines.push(`- Author count: ${hotspot.metrics.authorCount}`);
    lines.push(`- Related module count: ${hotspot.metrics.relatedModuleCount}`);
  }

  lines.push("");

  lines.push("## Related Modules");
  lines.push("");

  if (relatedActivities.length === 0) {
    lines.push("- No related modules found.");
  } else {
    for (const related of relatedActivities) {
      const relatedRisk = relatedHotspots.find(
        (hotspot) => hotspot.moduleId === related.moduleId
      );

      lines.push(`### ${moduleName(related.moduleId)}`);
      lines.push("");
      lines.push(`- Weighted change count: ${related.changeCount}`);
      lines.push(`- Authors observed: ${related.authors.length}`);
      lines.push(
        `- Risk: ${
          relatedRisk ? riskLevel(relatedRisk.hotspotScore) : "unknown"
        }`
      );
      lines.push("");
    }
  }

  lines.push("## Relevant Timeline");
  lines.push("");

  if (relevantTimeline.length === 0) {
    lines.push("- No timeline entries found for this module.");
  } else {
    for (const day of relevantTimeline.slice(-10)) {
      lines.push(`### ${day.date}`);
      lines.push("");
      lines.push(`- Weighted changes: ${day.changeCount}`);
      lines.push(`- Events: ${day.eventCount}`);
      lines.push(
        `- Classifications: ${Object.entries(day.classifications)
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ")}`
      );
      lines.push("");
    }
  }

  lines.push("## Agent Instructions");
  lines.push("");
  lines.push("- Keep changes scoped to the target module unless related modules require updates.");
  lines.push("- Inspect related modules before changing shared boundaries.");
  lines.push("- Do not infer architecture from scaffold/bootstrap activity alone.");
  lines.push("- Preserve evidence-backed project memory.");
  lines.push("- Regenerate context with `npm run analyze` after structural changes.");
  lines.push("");

  lines.push("## Output Discipline");
  lines.push("");
  lines.push("- Do not edit generated reports or skills manually unless explicitly asked.");
  lines.push("- Modify source pipeline code, then regenerate outputs.");
  lines.push("- Keep durable machine-readable state under `knowledge/`.");
  lines.push("- Keep agent-facing Markdown under `outputs/`.");

  return lines.join("\n");
}

async function main() {
  const root = process.cwd();
  const target = process.argv[2];

  if (!target) {
    throw new Error(
      "Provide target module. Example: npm run context:pack -- core"
    );
  }

  const modules = await readLatestJson<ModuleActivityProjection[]>(
    join(root, "knowledge", "projections", "module-activity")
  );

  const hotspots = await readLatestJson<ModuleHotspot[]>(
    join(root, "knowledge", "projections", "hotspots")
  );

  const timeline = await readLatestJson<TimelineDay[]>(
    join(root, "knowledge", "projections", "timeline")
  );

  const outputDir = join(root, "outputs", "context-packs");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, `${moduleName(moduleId(target))}.md`);

  await writeFile(
    outputPath,
    renderContextPack({
      targetModule: target,
      modules,
      hotspots,
      timeline,
    }),
    "utf8"
  );

  console.log(`Saved context pack to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});