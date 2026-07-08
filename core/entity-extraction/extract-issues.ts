import { Entity } from "../../knowledge/schemas/entity";
import { EntityType } from "../../knowledge/ontology/entities";
import { NormalizedEvent } from "../../knowledge/schemas/normalized-event";

const ISSUE_EVENT_TYPES = new Set(["issue.created", "issue.closed"]);

function upsertIssue(
  entities: Map<string, Entity>,
  entityId: string,
  event: NormalizedEvent,
  fallbackName: string,
  tags: string[],
  identifierMetadata: Record<string, unknown>
) {
  const now = new Date().toISOString();
  const existing = entities.get(entityId);

  if (!existing) {
    entities.set(entityId, {
      id: entityId,
      type: EntityType.Issue,
      name: event.title ?? fallbackName,
      description: event.summary,
      confidence: 0.8,
      evidenceIds: event.evidenceIds ?? [],
      tags,
      firstSeenAt: event.timestamp,
      lastSeenAt: event.timestamp,
      metadata: {
        source: event.source,
        ...identifierMetadata,
        state: event.payload.state ?? event.payload.stateName ?? event.payload.statusName,
        url: event.payload.url,
      },
      createdAt: now,
      updatedAt: now,
    });
    return;
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
    state:
      event.payload.state ??
      event.payload.stateName ??
      event.payload.statusName ??
      existing.metadata?.state,
  };

  existing.updatedAt = now;
}

export function extractIssues(events: NormalizedEvent[]): Entity[] {
  const entities = new Map<string, Entity>();

  for (const event of events) {
    if (!ISSUE_EVENT_TYPES.has(event.type)) continue;

    if (event.source === "github") {
      const number = event.payload.number;

      if (typeof number !== "number") continue;

      upsertIssue(
        entities,
        `issue.${number}`,
        event,
        `Issue #${number}`,
        ["github", "issue"],
        { number }
      );
    } else if (event.source === "linear") {
      const identifier = event.payload.identifier;

      if (typeof identifier !== "string") continue;

      upsertIssue(
        entities,
        `issue.linear.${identifier}`,
        event,
        `Issue ${identifier}`,
        ["linear", "issue"],
        { identifier }
      );
    } else if (event.source === "jira") {
      const key = event.payload.key;

      if (typeof key !== "string") continue;

      upsertIssue(
        entities,
        `issue.jira.${key}`,
        event,
        `Issue ${key}`,
        ["jira", "issue"],
        { key }
      );
    }
  }

  return Array.from(entities.values());
}
