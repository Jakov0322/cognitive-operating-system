import "dotenv/config";

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings";
const BATCH_SIZE = 100;

type VoyageEmbeddingResponse = {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
};

function embeddingModel(): string {
  return process.env.VOYAGE_EMBEDDING_MODEL ?? "voyage-3-lite";
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const apiKey = process.env.VOYAGE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing VOYAGE_API_KEY in environment");
  }

  const vectors: number[][] = [];

  for (const batch of chunk(texts, BATCH_SIZE)) {
    const response = await fetch(VOYAGE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        input: batch,
        model: embeddingModel(),
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Voyage AI embedding request failed: ${response.status} ${body}`
      );
    }

    const payload = (await response.json()) as VoyageEmbeddingResponse;

    const sorted = [...payload.data].sort((a, b) => a.index - b.index);
    vectors.push(...sorted.map((item) => item.embedding));
  }

  return vectors;
}

export async function embedText(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector;
}
