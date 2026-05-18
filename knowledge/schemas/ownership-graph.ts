export type OwnershipGraphNode = {
  id: string;
  type: "person" | "module";
  label: string;
};

export type OwnershipGraphEdge = {
  from: string;
  to: string;
  type: "owns" | "contributes_to";
  weight: number;
  confidence: {
    score: number;
    level: "low" | "medium" | "high";
  };
  evidenceIds: string[];
};

export type OwnershipGraph = {
  id: string;
  generatedAt: string;
  nodes: OwnershipGraphNode[];
  edges: OwnershipGraphEdge[];
};