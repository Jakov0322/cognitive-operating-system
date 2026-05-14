import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { extractAuthors } from "./extract-authors";
import { extractModules } from "./extract-modules";
import { Entity } from "../../knowledge/schemas/entity";
import { NormalizedEvent } from "../../knowledge/schemas/normalized-event";

function mergeEntities(entities: Entity[]): Entity[] {
  const map = new Map<string, Entity>();

  for (const entity of entities) {
    const existing = map.get(entity.id);

    if (!existing) {
      map.set(entity.id, entity);
      continue;
    }

    map.set(entity.id, {
      ...existing,
      evidenceIds: Array.from(
        new Set([...existing.evidenceIds, ...entity.evidenceIds])
      ),
      tags: Array.from(
        new Set([...(existing.tags ?? []), ...(entity.tags ?? [])])
      ),
      updatedAt: new Date().toISOString(),
    });
  }

  return Array.from(map.values());
}

async function main() {
  const repositoryPath = process.cwd();

  const entitiesDir = join(repositoryPath, "knowledge", "graph", "entities");
  await mkdir(entitiesDir, { recursive: true });

  const latestFile = process.argv[2];

  if (!latestFile) {
    throw new Error("Provide normalized event file path as argument");
  }

  const raw = await readFile(latestFile, "utf8");
  const events = JSON.parse(raw) as NormalizedEvent[];

  const entities = mergeEntities([
    ...extractModules(events),
    ...extractAuthors(events),
  ]);

  const outputPath = join(entitiesDir, `entities-${Date.now()}.json`);

  await writeFile(outputPath, JSON.stringify(entities, null, 2), "utf8");

  console.log(`Extracted entities: ${entities.length}`);
  console.log(`Saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});