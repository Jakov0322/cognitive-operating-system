import { Entity } from "../../knowledge/schemas/entity";
import { EntityType } from "../../knowledge/ontology/entities";
import { NormalizedEvent } from "../../knowledge/schemas/normalized-event";

export function extractAuthors(events: NormalizedEvent[]): Entity[] {
  const entities = new Map<string, Entity>();

  for (const event of events) {
    const actor = event.actor?.trim();

    if (!actor) {
      continue;
    }

    const email =
      typeof event.payload?.authorEmail === "string"
        ? event.payload.authorEmail
        : undefined;

    const entityId = normalizePersonId(actor, email);
    const now = new Date().toISOString();

    if (!entities.has(entityId)) {
      entities.set(entityId, {
        id: entityId,
        type: EntityType.Person,
        name: actor,
        confidence: 0.8,
        evidenceIds: event.evidenceIds ?? [],
        tags: ["git-author", "person"],
        firstSeenAt: event.timestamp,
        lastSeenAt: event.timestamp,
        metadata: {
          source: "local_git",
          email: event.payload?.authorEmail,
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

      existing.updatedAt = now;
    }
  }

  return Array.from(entities.values());
}

function normalizePersonId(name: string, email?: string): string {
  const value = email ?? name;

  return `person.${value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}