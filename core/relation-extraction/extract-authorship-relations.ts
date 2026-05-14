import { NormalizedEvent } from "../../knowledge/schemas/normalized-event";
import { Relation } from "../../knowledge/schemas/relation";
import { RelationType } from "../../knowledge/ontology/relations";

function normalizePersonId(name: string, email?: string): string {
  const value = email ?? name;

  return `person.${value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

function inferModuleName(filePath: string): string | null {
  const segments = filePath.split(/[\\/]/).filter(Boolean);

  if (segments.length === 0) return null;
  if (segments[0] === "src" && segments.length > 1) return segments[1];
  if (segments[0] === "apps" && segments.length > 1) return segments[1];
  if (segments[0] === "packages" && segments.length > 1) return segments[1];

  return segments[0];
}

export function extractAuthorshipRelations(events: NormalizedEvent[]): Relation[] {
  const relations = new Map<string, Relation>();

  for (const event of events) {
    if (!event.actor) continue;

    const email =
      typeof event.payload?.authorEmail === "string"
        ? event.payload.authorEmail
        : undefined;

    const personId = normalizePersonId(event.actor, email);

    for (const file of event.relatedFiles ?? []) {
      const moduleName = inferModuleName(file);
      if (!moduleName) continue;

      const moduleId = `module.${moduleName}`;
      const relationId = `relation.${personId}.modifies.${moduleId}`;
      const now = new Date().toISOString();

      if (!relations.has(relationId)) {
        relations.set(relationId, {
          id: relationId,
          type: RelationType.Modifies,
          fromEntityId: personId,
          toEntityId: moduleId,
          confidence: 0.75,
          evidenceIds: event.evidenceIds ?? [],
          metadata: {
            source: "local_git",
            changeCount: 1,
            exampleFiles: [file],
          },
          createdAt: now,
          updatedAt: now,
        });
      } else {
        const existing = relations.get(relationId)!;

        existing.evidenceIds = Array.from(
          new Set([...existing.evidenceIds, ...(event.evidenceIds ?? [])])
        );

        existing.metadata = {
          ...existing.metadata,
          changeCount: ((existing.metadata?.changeCount as number) ?? 1) + 1,
          exampleFiles: Array.from(
            new Set([
              ...((existing.metadata?.exampleFiles as string[]) ?? []),
              file,
            ])
          ).slice(0, 10),
        };

        existing.updatedAt = now;
      }
    }
  }

  return Array.from(relations.values());
}