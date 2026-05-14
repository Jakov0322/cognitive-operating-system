import { EntityType } from "../ontology/entities";

export type Entity = {
  id: string;
  type: EntityType;

  name: string;
  description?: string;

  aliases?: string[];
  tags?: string[];

  firstSeenAt?: string;
  lastSeenAt?: string;

  confidence: number;

  evidenceIds: string[];

  metadata?: Record<string, unknown>;

  createdAt: string;
  updatedAt: string;
};