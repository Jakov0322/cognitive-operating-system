import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { collectEmbeddableContent } from "./collect-embeddable-content";
import { embedTexts } from "./embedding-client";
import { EmbeddingRecord } from "../../knowledge/schemas/embedding";

function embeddingModel(): string {
  return process.env.VOYAGE_EMBEDDING_MODEL ?? "voyage-3-lite";
}

async function main() {
  const repositoryPath = process.cwd();

  const content = await collectEmbeddableContent(repositoryPath);

  if (content.length === 0) {
    console.log("No embeddable content found.");
    return;
  }

  const vectors = await embedTexts(content.map((item) => item.text));
  const model = embeddingModel();
  const now = new Date().toISOString();

  const records: EmbeddingRecord[] = content.map((item, index) => ({
    id: `embedding.${item.sourceType}.${item.sourceId}`,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    path: item.path,
    text: item.text,
    vector: vectors[index],
    model,
    createdAt: now,
  }));

  const outputDir = join(repositoryPath, "knowledge", "embeddings");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, `embeddings-${Date.now()}.json`);

  await writeFile(outputPath, JSON.stringify(records, null, 2), "utf8");

  console.log(`Built embeddings: ${records.length}`);
  console.log(`Saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
