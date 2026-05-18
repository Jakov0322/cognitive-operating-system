export type ConfidenceLevel = "low" | "medium" | "high";

export type ConfidenceScore = {
  score: number;
  level: ConfidenceLevel;
};