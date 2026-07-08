import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { Relation } from "../../knowledge/schemas/relation";
import { knowledgeDir } from "../shared/workspace";

type ModuleActivityProjection = {
  moduleId: string;
  changeCount: number;
  authors: string[];
  relatedModules: string[];
  evidenceIds: string[];
  updatedAt: string;
};

function buildModuleActivity(relations: Relation[]): ModuleActivityProjection[] {
  const modules = new Map<string, ModuleActivityProjection>();

  function ensureModule(moduleId: string): ModuleActivityProjection {
    const existing = modules.get(moduleId);

    if (existing) return existing;

    const created: ModuleActivityProjection = {
      moduleId,
      changeCount: 0,
      authors: [],
      relatedModules: [],
      evidenceIds: [],
      updatedAt: new Date().toISOString(),
    };

    modules.set(moduleId, created);

    return created;
  }

  for (const relation of relations) {
    if (relation.type === "modifies") {
      const module = ensureModule(relation.toEntityId);

      module.changeCount +=
        typeof relation.metadata?.changeCount === "number"
          ? relation.metadata.changeCount
          : 1;

      module.authors = Array.from(
        new Set([...module.authors, relation.fromEntityId])
      );

      module.evidenceIds = Array.from(
        new Set([...module.evidenceIds, ...relation.evidenceIds])
      );

      module.updatedAt = new Date().toISOString();
    }

    if (relation.type === "related_to") {
      const from = ensureModule(relation.fromEntityId);
      const to = ensureModule(relation.toEntityId);

      from.relatedModules = Array.from(
        new Set([...from.relatedModules, relation.toEntityId])
      );

      to.relatedModules = Array.from(
        new Set([...to.relatedModules, relation.fromEntityId])
      );

      from.evidenceIds = Array.from(
        new Set([...from.evidenceIds, ...relation.evidenceIds])
      );

      to.evidenceIds = Array.from(
        new Set([...to.evidenceIds, ...relation.evidenceIds])
      );

      from.updatedAt = new Date().toISOString();
      to.updatedAt = new Date().toISOString();
    }
  }

  return Array.from(modules.values()).sort(
    (a, b) => b.changeCount - a.changeCount
  );
}

async function main() {
  const relationFile = process.argv[2];

  if (!relationFile) {
    throw new Error("Provide relations file path as argument");
  }

  const raw = await readFile(relationFile, "utf8");
  const relations = JSON.parse(raw) as Relation[];

  const projection = buildModuleActivity(relations);

  const outputDir = knowledgeDir("projections", "module-activity");

  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, `module-activity-${Date.now()}.json`);

  await writeFile(outputPath, JSON.stringify(projection, null, 2), "utf8");

  console.log(`Projected modules: ${projection.length}`);
  console.log(`Saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});