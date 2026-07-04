import { NormalizedEvent } from "../../knowledge/schemas/normalized-event";
import { Relation } from "../../knowledge/schemas/relation";
import { RelationType } from "../../knowledge/ontology/relations";

const RESOLUTION_PATTERN = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;

const PULL_REQUEST_TYPES = new Set([
  "pull_request.opened",
  "pull_request.updated",
  "pull_request.merged",
  "pull_request.closed",
]);

function extractIssueNumbers(text: string): number[] {
  const numbers = new Set<number>();
  let match: RegExpExecArray | null;

  RESOLUTION_PATTERN.lastIndex = 0;

  while ((match = RESOLUTION_PATTERN.exec(text)) !== null) {
    numbers.add(Number(match[1]));
  }

  return Array.from(numbers);
}

export function extractIssueResolutionRelations(
  events: NormalizedEvent[]
): Relation[] {
  const relations = new Map<string, Relation>();

  for (const event of events) {
    if (event.source !== "github") continue;
    if (!PULL_REQUEST_TYPES.has(event.type)) continue;

    const number = event.payload.number;

    if (typeof number !== "number") continue;

    const text = `${event.title ?? ""}\n${event.summary ?? ""}`;
    const issueNumbers = extractIssueNumbers(text);

    if (issueNumbers.length === 0) continue;

    const fromEntityId = `pull_request.${number}`;
    const now = new Date().toISOString();

    for (const issueNumber of issueNumbers) {
      const toEntityId = `issue.${issueNumber}`;
      const relationId = `relation.${fromEntityId}.resolves.${toEntityId}`;

      if (!relations.has(relationId)) {
        relations.set(relationId, {
          id: relationId,
          type: RelationType.Resolves,
          fromEntityId,
          toEntityId,
          confidence: 0.7,
          evidenceIds: event.evidenceIds ?? [],
          metadata: {
            source: "github",
            matchedText: text.slice(0, 200),
          },
          createdAt: now,
          updatedAt: now,
        });
      } else {
        const existing = relations.get(relationId)!;

        existing.evidenceIds = Array.from(
          new Set([...existing.evidenceIds, ...(event.evidenceIds ?? [])])
        );

        existing.updatedAt = now;
      }
    }
  }

  return Array.from(relations.values());
}
