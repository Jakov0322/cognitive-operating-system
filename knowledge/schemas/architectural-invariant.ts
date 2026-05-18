export type ArchitecturalInvariantType =
  | "dependency_direction"
  | "forbidden_dependency"
  | "generated_zone"
  | "ownership_boundary";

export type ArchitecturalInvariant = {
  id: string;
  type: ArchitecturalInvariantType;

  description: string;

  sourceModules: string[];
  targetModules?: string[];

  confidence: {
    score: number;
    level: "low" | "medium" | "high";
  };

  evidenceIds: string[];

  metadata?: Record<string, unknown>;

  inferredAt: string;
};