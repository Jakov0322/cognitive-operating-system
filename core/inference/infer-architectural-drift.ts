import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { ArchitecturalDriftSignal } from "../../knowledge/schemas/architectural-drift";
import { knowledgeDir } from "../shared/workspace";

export type SnapshotDiff = {
  changes: {
    hotspotCountDelta: number;
    moduleCountDelta: number;
  };

  signals: string[];
};

export type ModuleActivity = {
  moduleId: string;
  relatedModules: string[];
  authors: string[];
  changeCount: number;
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

export function severity(score: number): "low" | "medium" | "high" {
  if (score >= 0.8) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

export function inferDriftSignals(
  diff: SnapshotDiff,
  modules: ModuleActivity[]
): ArchitecturalDriftSignal[] {
  const drifts: ArchitecturalDriftSignal[] = [];

  if (diff.changes.hotspotCountDelta > 0) {
    drifts.push({
      id: `drift.hotspot-growth.${Date.now()}`,

      type: "hotspot_growth",

      severity: severity(
        Math.min(1, diff.changes.hotspotCountDelta / 3)
      ),

      description:
        "Hotspot count increased between repository snapshots.",

      affectedModules: [],

      confidence: {
        score: 0.8,
        level: "high",
      },

      evidenceIds: [],

      inferredAt: new Date().toISOString(),
    });
  }

  if (diff.changes.moduleCountDelta > 0) {
    drifts.push({
      id: `drift.architecture-expansion.${Date.now()}`,

      type: "architecture_expansion",

      severity: severity(
        Math.min(1, diff.changes.moduleCountDelta / 5)
      ),

      description:
        "Architecture surface expanded with additional modules.",

      affectedModules: [],

      confidence: {
        score: 0.7,
        level: "medium",
      },

      evidenceIds: [],

      inferredAt: new Date().toISOString(),
    });
  }

  for (const module of modules) {
    const coupling = module.relatedModules.length;

    if (coupling >= 3 && module.changeCount >= 10) {
      drifts.push({
        id: `drift.coupling.${module.moduleId}.${Date.now()}`,

        type: "coupling_growth",

        severity: severity(
          Math.min(1, (coupling + module.changeCount / 10) / 4)
        ),

        description:
          "Module shows elevated coupling and sustained change activity.",

        affectedModules: [module.moduleId],

        confidence: {
          score: 0.75,
          level: "medium",
        },

        evidenceIds: module.evidenceIds,

        inferredAt: new Date().toISOString(),
      });
    }

    if (module.authors.length >= 3 && coupling >= 3) {
      drifts.push({
        id: `drift.ownership.${module.moduleId}.${Date.now()}`,

        type: "ownership_fragmentation",

        severity: "medium",

        description:
          "Module ownership appears fragmented across multiple contributors.",

        affectedModules: [module.moduleId],

        confidence: {
          score: 0.65,
          level: "medium",
        },

        evidenceIds: module.evidenceIds,

        inferredAt: new Date().toISOString(),
      });
    }
  }

  return drifts;
}

async function main() {
  const diffFile = await latestJsonFile(
    knowledgeDir("projections", "snapshot-diffs")
  );

  const moduleActivityFile = await latestJsonFile(
    knowledgeDir("projections", "module-activity")
  );

  const diff = JSON.parse(
    await readFile(diffFile, "utf8")
  ) as SnapshotDiff;

  const modules = JSON.parse(
    await readFile(moduleActivityFile, "utf8")
  ) as ModuleActivity[];

  const drifts = inferDriftSignals(diff, modules);

  const outputDir = knowledgeDir("projections", "architectural-drift");

  await mkdir(outputDir, { recursive: true });

  const outputPath = join(
    outputDir,
    `architectural-drift-${Date.now()}.json`
  );

  await writeFile(outputPath, JSON.stringify(drifts, null, 2), "utf8");

  console.log(`Inferred drift signals: ${drifts.length}`);
  console.log(`Saved to: ${outputPath}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}