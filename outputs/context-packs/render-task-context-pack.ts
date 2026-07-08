import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { semanticRetrieval } from "../../core/context/semantic-retrieval";
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
  const latest = await latestJsonFile(dir);
  const raw = await readFile(latest, "utf8");

  return JSON.parse(raw) as T;
}

function normalizeModuleId(name: string): string {
  if (name.startsWith("module.")) return name;
  return `module.${name}`;
}

function moduleName(id: string): string {
  return id.replace(/^module\./, "");
}

function riskLevel(score: number): string {
  if (score >= 0.75) return "HIGH";
  if (score >= 0.45) return "MEDIUM";
  return "LOW";
}

function detectRelevantModules(task: string): string[] {
  const normalized = task.toLowerCase();

  const mapping: Record<string, string[]> = {
    connectors: [
      "connector",
      "github",
      "gitlab",
      "jira",
      "linear",
      "discord",
      "slack",
      "sentry",
      "notion",
      "ingestion",
    ],
    core: [
      "core",
      "timeline",
      "infer",
      "inference",
      "relation",
      "entity",
      "normalization",
      "orchestration",
      "memory",
      "projection",
    ],
    knowledge: [
      "knowledge",
      "schema",
      "ontology",
      "graph",
      "events",
      "evidence",
      "embeddings",
    ],
    outputs: [
      "output",
      "report",
      "skill",
      "markdown",
      "context",
      "agent",
      "onboarding",
    ],
  };

  const matches = new Set<string>();

  for (const [module, keywords] of Object.entries(mapping)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      matches.add(normalizeModuleId(module));
    }
  }

  return Array.from(matches);
}

function renderTaskContextPack(params: {
  task: string;
  modules: ModuleActivityProjection[];
  hotspots: ModuleHotspot[];
  timeline: TimelineDay[];
  relevantModules: string[];
}): string {
  const lines: string[] = [];

  lines.push(`# Task Context Pack`);
  lines.push("");
  lines.push("## Task");
  lines.push("");
  lines.push(params.task);
  lines.push("");

  lines.push("## Relevant Modules");
  lines.push("");

  if (params.relevantModules.length === 0) {
    lines.push("- No relevant modules detected.");
  } else {
    for (const moduleId of params.relevantModules) {
      lines.push(`- \`${moduleName(moduleId)}/\``);
    }
  }

  lines.push("");

  lines.push("## Recommended Skills");
  lines.push("");
  lines.push("- `outputs/agent-context/AGENTS.md`");
  lines.push("- `outputs/skills/INDEX.md`");
  lines.push("- `outputs/skills/architecture/SKILL.md`");
  lines.push("- `outputs/skills/codebase-navigation/SKILL.md`");

  const hasHighRisk = params.hotspots.some(
    (hotspot) =>
      params.relevantModules.includes(hotspot.moduleId) &&
      hotspot.hotspotScore >= 0.45
  );

  if (hasHighRisk) {
    lines.push("- `outputs/skills/risk-hotspots/SKILL.md`");
  }

  lines.push("- `outputs/skills/project-timeline/SKILL.md`");
  lines.push("");

  lines.push("## Module Context");
  lines.push("");

  for (const moduleId of params.relevantModules) {
    const module = params.modules.find((item) => item.moduleId === moduleId);

    if (!module) continue;

    const hotspot = params.hotspots.find(
      (item) => item.moduleId === moduleId
    );

    lines.push(`### ${moduleName(moduleId)}`);
    lines.push("");
    lines.push(`- Weighted change count: ${module.changeCount}`);
    lines.push(`- Authors observed: ${module.authors.length}`);
    lines.push(
      `- Related modules: ${
        module.relatedModules.map(moduleName).join(", ") || "-"
      }`
    );

    if (hotspot) {
      lines.push(`- Risk: ${riskLevel(hotspot.hotspotScore)}`);
      lines.push(`- Hotspot score: ${hotspot.hotspotScore}`);

      if (hotspot.confidence) {
        lines.push(
          `- Confidence: ${hotspot.confidence.level} (${hotspot.confidence.score})`
        );
      }

      lines.push(
        `- Reasons: ${hotspot.reasons.join(", ") || "-"}`
      );
    }

    lines.push("");
  }

  lines.push("## Relevant Timeline");
  lines.push("");

  const timelineEntries = params.timeline.filter((day) =>
    day.modules.some((module) =>
      params.relevantModules.includes(module)
    )
  );

  if (timelineEntries.length === 0) {
    lines.push("- No relevant timeline activity found.");
  } else {
    for (const day of timelineEntries.slice(-10)) {
      lines.push(`### ${day.date}`);
      lines.push("");
      lines.push(`- Weighted changes: ${day.changeCount}`);
      lines.push(`- Events: ${day.eventCount}`);
      lines.push(
        `- Modules: ${
          day.modules.map(moduleName).join(", ") || "-"
        }`
      );
      lines.push("");
    }
  }

  lines.push("## Agent Guidance");
  lines.push("");
  lines.push("- Prefer minimal relevant context.");
  lines.push("- Keep changes scoped to the task.");
  lines.push("- Inspect related modules before changing shared boundaries.");
  lines.push("- Regenerate context after structural modifications.");
  lines.push("- Preserve evidence-backed architectural reasoning.");

  return lines.join("\n");
}

async function main() {
  const task = process.argv.slice(2).join(" ").trim();

  if (!task) {
    throw new Error(
      'Provide task description. Example: npm run context:task -- "refactor connectors"'
    );
  }

  const modules = await readLatestJson<ModuleActivityProjection[]>(
    knowledgeDir("projections", "module-activity")
  );

  const hotspots = await readLatestJson<ModuleHotspot[]>(
    knowledgeDir("projections", "hotspots")
  );

  const timeline = await readLatestJson<TimelineDay[]>(
    knowledgeDir("projections", "timeline")
  );

  const relevantModules = detectRelevantModules(task);

  const semantic = await semanticRetrieval(task);

  const mergedRelevantModules = Array.from(
    new Set([
      ...relevantModules,
      ...semantic.modules.map((module) => `module.${module}`),
    ])
  );

  const outputDir = outputsDir("context-packs");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, "task-context.md");

  await writeFile(
    outputPath,
    renderTaskContextPack({
      task,
      modules,
      hotspots,
      timeline,
      relevantModules: mergedRelevantModules,
    }),
    "utf8"
  );

  console.log(`Saved task context pack to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});