import { Entity } from "../../knowledge/schemas/entity";
import { EntityType } from "../../knowledge/ontology/entities";
import { NormalizedEvent } from "../../knowledge/schemas/normalized-event";

export function extractIssues(events: NormalizedEvent[]): Entity[] {
  const entities = new Map<string, Entity>();

  for (const event of events) {
    if (event.source !== "github") continue;
    if (event.type !== "issue.created" && event.type !== "issue.closed") continue;

    const number = event.payload.number;

    if (typeof number !== "number") continue;

    const entityId = `issue.${number}`;
    const now = new Date().toISOString();

    if (!entities.has(entityId)) {
      entities.set(entityId, {
        id: entityId,
        type: EntityType.Issue,
        name: event.title ?? `Issue #${number}`,
        description: event.summary,
        confidence: 0.8,
        evidenceIds: event.evidenceIds ?? [],
        tags: ["github", "issue"],
        firstSeenAt: event.timestamp,
        lastSeenAt: event.timestamp,
        metadata: {
          source: "github",
          number,
          state: event.payload.state,
          url: event.payload.url,
        },
        createdAt: now,
        updatedAt: now,
      });
    } else {
      const existing = entities.get(entityId)!;

      existing.lastSeenAt =
        existing.lastSeenAt && existing.lastSeenAt > event.timestamp
          ? existing.lastSeenAt
          : event.timestamp;

      existing.evidenceIds = Array.from(
        new Set([...existing.evidenceIds, ...(event.evidenceIds ?? [])])
      );

      existing.metadata = {
        ...existing.metadata,
        state: event.payload.state ?? existing.metadata?.state,
      };

      existing.updatedAt = now;
    }
  }

  return Array.from(entities.values());
}
