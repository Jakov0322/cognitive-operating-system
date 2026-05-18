import { NormalizedEvent } from "../../knowledge/schemas/normalized-event";
import { Relation } from "../../knowledge/schemas/relation";
import { RelationType } from "../../knowledge/ontology/relations";
import { shouldIgnoreForModuleInference } from "../shared/path-filters";
import { classifyEvent } from "../shared/event-classification";

function normalizePersonId(name: string, email?: string): string {
  const value = email ?? name;

  return `person.${value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

function eventWeight(event: NormalizedEvent): number {
  const classification = classifyEvent(event);

  if (classification === "scaffold") return 0.25;
  if (classification === "maintenance") return 0.5;

  return 1;
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
    const classification = classifyEvent(event);
    const weight = eventWeight(event);

    for (const file of event.relatedFiles ?? []) {
      if (shouldIgnoreForModuleInference(file)) continue;

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
            changeCount: weight,
            eventClassifications: [classification],
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
          changeCount:
            ((existing.metadata?.changeCount as number) ?? 0) + weight,
          eventClassifications: Array.from(
            new Set([
              ...((existing.metadata?.eventClassifications as string[]) ?? []),
              classification,
            ])
          ),
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