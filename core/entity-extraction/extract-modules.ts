import { Entity } from "../../knowledge/schemas/entity";
import { EntityType } from "../../knowledge/ontology/entities";
import { NormalizedEvent } from "../../knowledge/schemas/normalized-event";

function inferModuleName(filePath: string): string | null {
  const segments = filePath.split(/[\\/]/).filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  if (segments[0] === "src" && segments.length > 1) {
    return segments[1];
  }

  if (segments[0] === "apps" && segments.length > 1) {
    return segments[1];
  }

  if (segments[0] === "packages" && segments.length > 1) {
    return segments[1];
  }

  return segments[0];
}

function shouldIgnoreFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");

  const ignoredExactFiles = new Set([
    ".gitignore",
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "README.md",
    "PROJECT_STRUCTURE.md",
    "tsconfig.json",
  ]);

  if (ignoredExactFiles.has(normalized)) {
    return true;
  }

  const ignoredPrefixes = [
    "node_modules/",
    "dist/",
    "build/",
    "coverage/",
    ".next/",
    ".git/",
  ];

  return ignoredPrefixes.some((prefix) => normalized.startsWith(prefix));
}

export function extractModules(events: NormalizedEvent[]): Entity[] {
  const entities = new Map<string, Entity>();

  for (const event of events) {
    for (const file of event.relatedFiles ?? []) {
      if (shouldIgnoreFile(file)) {
        continue;
      }
      const moduleName = inferModuleName(file);

      if (!moduleName) {
        continue;
      }

      const entityId = `module.${moduleName}`;
      const now = new Date().toISOString();

      if (!entities.has(entityId)) {
        entities.set(entityId, {
          id: entityId,
          type: EntityType.Module,
          name: moduleName,
          confidence: 0.75,
          evidenceIds: event.evidenceIds ?? [],
          tags: ["module", "inferred-from-path"],
          firstSeenAt: event.timestamp,
          lastSeenAt: event.timestamp,
          metadata: {
            source: "file-path",
            exampleFiles: [file],
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

        const exampleFiles = new Set<string>([
          ...((existing.metadata?.exampleFiles as string[]) ?? []),
          file,
        ]);

        existing.metadata = {
          ...existing.metadata,
          exampleFiles: Array.from(exampleFiles).slice(0, 10),
        };

        existing.updatedAt = now;
      }
    }
  }

  return Array.from(entities.values());
}