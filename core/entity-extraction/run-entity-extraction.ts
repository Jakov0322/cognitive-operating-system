import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { extractAuthors } from "./extract-authors";
import { extractModules } from "./extract-modules";
import { extractIssues } from "./extract-issues";
import { extractPullRequests } from "./extract-pull-requests";
import { extractCIJobs } from "./extract-ci-jobs";
import { Entity } from "../../knowledge/schemas/entity";
import { NormalizedEvent } from "../../knowledge/schemas/normalized-event";
import { knowledgeDir } from "../shared/workspace";

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
  const entitiesDir = knowledgeDir("graph", "entities");
  await mkdir(entitiesDir, { recursive: true });

  const files = process.argv.slice(2);

  if (files.length === 0) {
    throw new Error("Provide at least one normalized event file path as argument");
  }

  const events: NormalizedEvent[] = [];

  for (const file of files) {
    const raw = await readFile(file, "utf8");
    events.push(...(JSON.parse(raw) as NormalizedEvent[]));
  }

  const entities = mergeEntities([
    ...extractModules(events),
    ...extractAuthors(events),
    ...extractIssues(events),
    ...extractPullRequests(events),
    ...extractCIJobs(events),
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