import { RelationType } from "../ontology/relations";

export type Relation = {
  id: string;
  type: RelationType;

  fromEntityId: string;
  toEntityId: string;

  confidence: number;

  evidenceIds: string[];

  metadata?: Record<string, unknown>;

  createdAt: string;
  updatedAt: string;
};