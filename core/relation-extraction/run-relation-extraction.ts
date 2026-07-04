import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

import { NormalizedEvent } from "../../knowledge/schemas/normalized-event";
import { Relation } from "../../knowledge/schemas/relation";
import { extractAuthorshipRelations } from "./extract-authorship-relations";
import { extractModuleChangeRelations } from "./extract-module-change-relations";
import { extractIssueResolutionRelations } from "./extract-issue-resolution-relations";

function mergeRelations(relations: Relation[]): Relation[] {
  const map = new Map<string, Relation>();

  for (const relation of relations) {
    const existing = map.get(relation.id);

    if (!existing) {
      map.set(relation.id, relation);
      continue;
    }

    map.set(relation.id, {
      ...existing,
      evidenceIds: Array.from(
        new Set([...existing.evidenceIds, ...relation.evidenceIds])
      ),
      updatedAt: new Date().toISOString(),
    });
  }

  return Array.from(map.values());
}

async function main() {
  const repositoryPath = process.cwd();

  const relationsDir = join(repositoryPath, "knowledge", "graph", "relations");
  await mkdir(relationsDir, { recursive: true });

  const files = process.argv.slice(2);

  if (files.length === 0) {
    throw new Error("Provide at least one normalized event file path as argument");
  }

  const events: NormalizedEvent[] = [];

  for (const file of files) {
    const raw = await readFile(file, "utf8");
    events.push(...(JSON.parse(raw) as NormalizedEvent[]));
  }

  const relations = mergeRelations([
    ...extractAuthorshipRelations(events),
    ...extractModuleChangeRelations(events),
    ...extractIssueResolutionRelations(events),
  ]);

  const outputPath = join(relationsDir, `relations-${Date.now()}.json`);

  await writeFile(outputPath, JSON.stringify(relations, null, 2), "utf8");

  console.log(`Extracted relations: ${relations.length}`);
  console.log(`Saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});