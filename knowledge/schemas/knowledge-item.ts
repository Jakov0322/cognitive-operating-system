import { KnowledgeCategory } from "../ontology/categories";
import { EvidenceRef } from "./evidence";

export type KnowledgeItem = {
  id: string;
  category: KnowledgeCategory;
  title: string;
  summary: string;
  confidence: number;
  evidence: EvidenceRef[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
};