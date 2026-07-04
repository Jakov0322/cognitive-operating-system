import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { CONTEXT_ARTIFACTS } from "../context/artifact-registry";
import { NormalizedEvent } from "../../knowledge/schemas/normalized-event";
import { EvidenceRef } from "../../knowledge/schemas/evidence";

export type EmbeddableContent = {
  sourceType: "artifact" | "event" | "evidence";
  sourceId: string;
  path?: string;
  text: string;
};

const MAX_TEXT_LENGTH = 8000;

function truncate(text: string): string {
  return text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;
}

async function listJsonFiles(dir: string): Promise<string[]> {
  try {
    const files = await readdir(dir);
    return files.filter((file) => file.endsWith(".json")).map((file) => join(dir, file));
  } catch {
    return [];
  }
}

async function collectArtifactContent(
  repositoryPath: string
): Promise<EmbeddableContent[]> {
  const content: EmbeddableContent[] = [];

  for (const artifact of CONTEXT_ARTIFACTS) {
    try {
      const text = await readFile(join(repositoryPath, artifact.path), "utf8");

      content.push({
        sourceType: "artifact",
        sourceId: artifact.id,
        path: artifact.path,
        text: truncate(text),
      });
    } catch {
      continue;
    }
  }

  return content;
}

async function collectEventContent(
  repositoryPath: string
): Promise<EmbeddableContent[]> {
  const dir = join(repositoryPath, "knowledge", "events", "normalized");
  const files = await listJsonFiles(dir);

  const content: EmbeddableContent[] = [];

  for (const file of files) {
    const raw = await readFile(file, "utf8");
    const events = JSON.parse(raw) as NormalizedEvent[];

    for (const event of events) {
      const text = `${event.title ?? ""}\n${event.summary ?? ""}`.trim();

      if (!text) continue;

      content.push({
        sourceType: "event",
        sourceId: event.id,
        text: truncate(text),
      });
    }
  }

  return content;
}

async function collectEvidenceContent(
  repositoryPath: string
): Promise<EmbeddableContent[]> {
  const dir = join(repositoryPath, "knowledge", "evidence");
  const files = await listJsonFiles(dir);

  const content: EmbeddableContent[] = [];

  for (const file of files) {
    const raw = await readFile(file, "utf8");
    const evidenceItems = JSON.parse(raw) as EvidenceRef[];

    for (const evidence of evidenceItems) {
      if (!evidence.excerpt) continue;

      content.push({
        sourceType: "evidence",
        sourceId: evidence.id,
        text: truncate(evidence.excerpt),
      });
    }
  }

  return content;
}

function deduplicate(content: EmbeddableContent[]): EmbeddableContent[] {
  const byId = new Map<string, EmbeddableContent>();

  for (const item of content) {
    byId.set(`${item.sourceType}.${item.sourceId}`, item);
  }

  return Array.from(byId.values());
}

export async function collectEmbeddableContent(
  repositoryPath: string
): Promise<EmbeddableContent[]> {
  const [artifacts, events, evidence] = await Promise.all([
    collectArtifactContent(repositoryPath),
    collectEventContent(repositoryPath),
    collectEvidenceContent(repositoryPath),
  ]);

  return deduplicate([...artifacts, ...events, ...evidence]);
}
