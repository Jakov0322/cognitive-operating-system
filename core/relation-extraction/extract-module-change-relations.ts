import { NormalizedEvent } from "../../knowledge/schemas/normalized-event";
import { Relation } from "../../knowledge/schemas/relation";
import { classifyEvent } from "../shared/event-classification";
import { shouldIgnoreForModuleInference } from "../shared/path-filters";
import { RelationType } from "../../knowledge/ontology/relations";

function inferModuleName(filePath: string): string | null {
  const segments = filePath.split(/[\\/]/).filter(Boolean);

  if (segments.length === 0) return null;
  if (segments[0] === "src" && segments.length > 1) return segments[1];
  if (segments[0] === "apps" && segments.length > 1) return segments[1];
  if (segments[0] === "packages" && segments.length > 1) return segments[1];

  return segments[0];
}

function eventWeight(event: NormalizedEvent): number {
  const classification = classifyEvent(event);

  if (classification === "scaffold") return 0.25;
  if (classification === "maintenance") return 0.5;

  return 1;
}

export function extractModuleChangeRelations(
  events: NormalizedEvent[]
): Relation[] {
  const relations = new Map<string, Relation>();

  for (const event of events) {
    const classification = classifyEvent(event);
    const weight = eventWeight(event);

    const modules = Array.from(
      new Set(
        (event.relatedFiles ?? [])
          .filter((file) => !shouldIgnoreForModuleInference(file))
          .map(inferModuleName)
          .filter((value): value is string => Boolean(value))
      )
    );

    if (modules.length < 2) continue;

    for (let i = 0; i < modules.length; i++) {
      for (let j = i + 1; j < modules.length; j++) {
        const from = `module.${modules[i]}`;
        const to = `module.${modules[j]}`;

        const relationId = `relation.${from}.related_to.${to}`;
        const now = new Date().toISOString();

        if (!relations.has(relationId)) {
          relations.set(relationId, {
            id: relationId,
            type: RelationType.RelatedTo,
            fromEntityId: from,
            toEntityId: to,
            confidence: 0.55,
            evidenceIds: event.evidenceIds ?? [],
            metadata: {
              source: "co-change",
              coChangeCount: weight,
              eventClassifications: [classification],
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
            coChangeCount:
              ((existing.metadata?.coChangeCount as number) ?? 0) + weight,
            eventClassifications: Array.from(
              new Set([
                ...((existing.metadata?.eventClassifications as string[]) ?? []),
                classification,
              ])
            ),
          };

          existing.updatedAt = now;
        }
      }
    }
  }

  return Array.from(relations.values());
}