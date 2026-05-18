import { ConfidenceLevel, ConfidenceScore } from "../../knowledge/ontology/confidence";

export function clampConfidence(score: number): number {
  return Math.max(0, Math.min(1, score));
}

export function confidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.75) return "high";
  if (score >= 0.45) return "medium";
  return "low";
}

export function confidence(score: number): ConfidenceScore {
  const normalized = clampConfidence(score);

  return {
    score: normalized,
    level: confidenceLevel(normalized),
  };
}

export function confidenceFromEvidenceCount(count: number): ConfidenceScore {
  if (count <= 0) return confidence(0.1);
  if (count === 1) return confidence(0.4);
  if (count <= 3) return confidence(0.6);
  if (count <= 10) return confidence(0.8);

  return confidence(0.9);
}

export function confidenceFromWeightedCount(count: number): ConfidenceScore {
  if (count <= 0) return confidence(0.1);
  if (count < 1) return confidence(0.25);
  if (count < 3) return confidence(0.45);
  if (count < 8) return confidence(0.65);
  if (count < 20) return confidence(0.8);

  return confidence(0.9);
}