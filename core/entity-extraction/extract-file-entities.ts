import { Entity } from "../../knowledge/schemas/entity";
import { EntityType } from "../../knowledge/ontology/entities";
import { NormalizedEvent } from "../../knowledge/schemas/normalized-event";

export function extractFileEntities(
  events: NormalizedEvent[]
): Entity[] {
  const entities = new Map<string, Entity>();

  for (const event of events) {
    const files = event.relatedFiles ?? [];

    for (const file of files) {
      const segments = file.split("/").filter(Boolean);

      if (segments.length === 0) {
        continue;
      }

      const moduleName = segments[0];

      const entityId = `module.${moduleName}`;

      if (!entities.has(entityId)) {
        const now = new Date().toISOString();

        entities.set(entityId, {
          id: entityId,
          type: EntityType.Module,

          name: moduleName,

          confidence: 0.6,

          evidenceIds: event.evidenceIds ?? [],

          tags: ["filesystem", "module"],

          metadata: {
            source: "file-structure",
          },

          createdAt: now,
          updatedAt: now,
        });
      }
    }
  }

  return Array.from(entities.values());
}