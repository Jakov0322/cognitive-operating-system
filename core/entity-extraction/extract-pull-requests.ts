import { Entity } from "../../knowledge/schemas/entity";
import { EntityType } from "../../knowledge/ontology/entities";
import { NormalizedEvent } from "../../knowledge/schemas/normalized-event";

const PULL_REQUEST_TYPES = new Set([
  "pull_request.opened",
  "pull_request.updated",
  "pull_request.merged",
  "pull_request.closed",
]);

export function extractPullRequests(events: NormalizedEvent[]): Entity[] {
  const entities = new Map<string, Entity>();

  for (const event of events) {
    if (event.source !== "github") continue;
    if (!PULL_REQUEST_TYPES.has(event.type)) continue;

    const number = event.payload.number;

    if (typeof number !== "number") continue;

    const entityId = `pull_request.${number}`;
    const now = new Date().toISOString();

    if (!entities.has(entityId)) {
      entities.set(entityId, {
        id: entityId,
        type: EntityType.PullRequest,
        name: event.title ?? `Pull Request #${number}`,
        description: event.summary,
        confidence: 0.8,
        evidenceIds: event.evidenceIds ?? [],
        tags: ["github", "pull_request"],
        firstSeenAt: event.timestamp,
        lastSeenAt: event.timestamp,
        metadata: {
          source: "github",
          number,
          state: event.payload.state,
          merged: event.payload.merged,
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
        merged: event.payload.merged ?? existing.metadata?.merged,
      };

      existing.updatedAt = now;
    }
  }

  return Array.from(entities.values());
}
