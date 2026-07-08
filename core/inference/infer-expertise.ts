import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { confidence } from "../shared/confidence";
import { ExpertiseProfile } from "../../knowledge/schemas/expertise-profile";
import { knowledgeDir } from "../shared/workspace";

type Relation = {
  type: string;

  fromEntityId: string;
  toEntityId: string;

  metadata?: {
    weightedChangeCount?: number;
    changeCount?: number;
  };

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

function expertiseAreas(modules: string[]): string[] {
  const areas = new Set<string>();

  for (const module of modules) {
    if (module.includes("connectors")) {
      areas.add("external-systems");
      areas.add("ingestion");
    }

    if (module.includes("core")) {
      areas.add("inference");
      areas.add("orchestration");
      areas.add("cognition");
    }

    if (module.includes("knowledge")) {
      areas.add("knowledge-graph");
      areas.add("ontology");
      areas.add("memory");
    }

    if (module.includes("outputs")) {
      areas.add("agent-context");
      areas.add("report-generation");
    }
  }

  return Array.from(areas);
}

async function main() {
  const relationsFile = await latestJsonFile(
    knowledgeDir("graph", "relations")
  );

  const relations = JSON.parse(
    await readFile(relationsFile, "utf8")
  ) as Relation[];

  const modifies = relations.filter(
    (relation) => relation.type === "modifies"
  );

  const grouped = new Map<
    string,
    {
      modules: Map<string, number>;
      evidenceIds: Set<string>;
    }
  >();

  for (const relation of modifies) {
    const personId = relation.fromEntityId;
    const moduleId = relation.toEntityId;

    const weight =
      relation.metadata?.weightedChangeCount ??
      relation.metadata?.changeCount ??
      1;

    if (!grouped.has(personId)) {
      grouped.set(personId, {
        modules: new Map(),
        evidenceIds: new Set(),
      });
    }

    const entry = grouped.get(personId)!;

    entry.modules.set(
      moduleId,
      (entry.modules.get(moduleId) ?? 0) + weight
    );

    for (const evidenceId of relation.evidenceIds ?? []) {
      entry.evidenceIds.add(evidenceId);
    }
  }

  const profiles: ExpertiseProfile[] = [];

  for (const [personId, data] of grouped.entries()) {
    const strongestModules = Array.from(data.modules.entries())
      .map(([moduleId, score]) => ({
        moduleId,
        score: Math.round(score * 100) / 100,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const profile: ExpertiseProfile = {
      personId,

      strongestModules,

      expertiseAreas: expertiseAreas(
        strongestModules.map((item) => item.moduleId)
      ),

      ownershipConfidence: confidence(
        Math.min(
          1,
          strongestModules.reduce((sum, item) => sum + item.score, 0) / 20
        )
      ),

      evidenceIds: Array.from(data.evidenceIds),

      inferredAt: new Date().toISOString(),
    };

    profiles.push(profile);
  }

  const outputDir = knowledgeDir("projections", "expertise");

  await mkdir(outputDir, { recursive: true });

  const outputPath = join(
    outputDir,
    `expertise-${Date.now()}.json`
  );

  await writeFile(outputPath, JSON.stringify(profiles, null, 2), "utf8");

  console.log(`Inferred expertise profiles: ${profiles.length}`);
  console.log(`Saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});