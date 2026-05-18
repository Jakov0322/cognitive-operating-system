export type ContextArtifactType =
  | "agent-context"
  | "skill"
  | "report"
  | "context-pack";

export type ContextArtifact = {
  id: string;
  type: ContextArtifactType;
  title: string;
  path: string;
  description: string;
  modules: string[];
  keywords: string[];
};