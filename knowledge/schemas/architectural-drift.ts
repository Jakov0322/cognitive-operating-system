export type ArchitecturalDriftSignal = {
  id: string;

  type:
    | "coupling_growth"
    | "hotspot_growth"
    | "architecture_expansion"
    | "ownership_fragmentation"
    | "boundary_erosion";

  severity: "low" | "medium" | "high";

  description: string;

  affectedModules: string[];

  confidence: {
    score: number;
    level: "low" | "medium" | "high";
  };

  evidenceIds: string[];

  inferredAt: string;
};