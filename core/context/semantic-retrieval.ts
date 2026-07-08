import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { CONTEXT_ARTIFACTS } from "./artifact-registry";
import { embedText } from "../embeddings/embedding-client";
import { cosineSimilarity } from "../embeddings/vector-math";
import { EmbeddingRecord } from "../../knowledge/schemas/embedding";
import { knowledgeDir } from "../shared/workspace";

export type SemanticMatch = {
  path: string;
  score: number;
};

export type SemanticRetrievalResult = {
  modules: string[];
  matches: SemanticMatch[];
};

const TOP_K = 6;
const EMPTY_RESULT: SemanticRetrievalResult = { modules: [], matches: [] };

async function latestEmbeddingsFile(): Promise<string | null> {
  const dir = knowledgeDir("embeddings");

  let files: string[];

  try {
    files = await readdir(dir);
  } catch {
    return null;
  }

  const matched = files
    .filter((file) => file.endsWith(".json"))
    .sort()
    .reverse();

  return matched.length > 0 ? join(dir, matched[0]) : null;
}

export async function semanticRetrieval(
  task: string
): Promise<SemanticRetrievalResult> {
  const embeddingsFile = await latestEmbeddingsFile();

  if (!embeddingsFile) {
    return EMPTY_RESULT;
  }

  const raw = await readFile(embeddingsFile, "utf8");
  const records = JSON.parse(raw) as EmbeddingRecord[];

  const artifactRecords = records.filter(
    (record) => record.sourceType === "artifact" && record.path
  );

  if (artifactRecords.length === 0) {
    return EMPTY_RESULT;
  }

  let taskVector: number[];

  try {
    taskVector = await embedText(task);
  } catch {
    return EMPTY_RESULT;
  }

  const scored = artifactRecords
    .map((record) => ({
      path: record.path as string,
      score: cosineSimilarity(taskVector, record.vector),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K);

  const modules = Array.from(
    new Set(
      scored.flatMap((match) => {
        const artifact = CONTEXT_ARTIFACTS.find(
          (item) => item.path === match.path
        );

        return artifact?.modules ?? [];
      })
    )
  );

  return { modules, matches: scored };
}
