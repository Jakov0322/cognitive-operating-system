export type EmbeddingSourceType = "artifact" | "event" | "evidence";

export type EmbeddingRecord = {
  id: string;
  sourceType: EmbeddingSourceType;
  sourceId: string;
  path?: string;
  text: string;
  vector: number[];
  model: string;
  createdAt: string;
};
