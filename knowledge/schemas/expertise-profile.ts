export type ExpertiseProfile = {
  personId: string;

  strongestModules: {
    moduleId: string;
    score: number;
  }[];

  expertiseAreas: string[];

  ownershipConfidence: {
    score: number;
    level: "low" | "medium" | "high";
  };

  evidenceIds: string[];

  inferredAt: string;
};