import { Entity } from "../../knowledge/schemas/entity";
import { EntityType } from "../../knowledge/ontology/entities";
import { NormalizedEvent } from "../../knowledge/schemas/normalized-event";

const CI_EVENT_TYPES = new Set(["ci.started", "ci.failed", "ci.passed"]);

export function extractCIJobs(events: NormalizedEvent[]): Entity[] {
  const entities = new Map<string, Entity>();

  for (const event of events) {
    if (event.source !== "ci") continue;
    if (!CI_EVENT_TYPES.has(event.type)) continue;

    const id = event.payload.id;

    if (typeof id !== "number") continue;

    const entityId = `ci_job.${id}`;
    const now = new Date().toISOString();
    const existing = entities.get(entityId);

    if (!existing) {
      entities.set(entityId, {
        id: entityId,
        type: EntityType.CIJob,
        name: event.title ?? `CI Run #${id}`,
        description: event.summary,
        confidence: 0.8,
        evidenceIds: event.evidenceIds ?? [],
        tags: ["ci", "workflow_run"],
        firstSeenAt: event.timestamp,
        lastSeenAt: event.timestamp,
        metadata: {
          source: "ci",
          status: event.payload.status,
          conclusion: event.payload.conclusion,
          branch: event.branch,
          url: event.payload.url,
        },
        createdAt: now,
        updatedAt: now,
      });
      continue;
    }

    existing.lastSeenAt =
      existing.lastSeenAt && existing.lastSeenAt > event.timestamp
        ? existing.lastSeenAt
        : event.timestamp;

    existing.evidenceIds = Array.from(
      new Set([...existing.evidenceIds, ...(event.evidenceIds ?? [])])
    );

    existing.metadata = {
      ...existing.metadata,
      status: event.payload.status ?? existing.metadata?.status,
      conclusion: event.payload.conclusion ?? existing.metadata?.conclusion,
    };

    existing.updatedAt = now;
  }

  return Array.from(entities.values());
}
