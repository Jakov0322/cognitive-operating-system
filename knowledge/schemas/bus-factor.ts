export type BusFactorRisk = {
  moduleId: string;

  busFactor: number;

  riskLevel: "low" | "medium" | "high";

  primaryOwners: string[];

  contributors: string[];

  confidence: {
    score: number;
    level: "low" | "medium" | "high";
  };

  evidenceIds: string[];

  inferredAt: string;
};