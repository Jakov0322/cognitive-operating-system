export type RepositorySnapshot = {
  id: string;

  createdAt: string;

  metadata: {
    repositoryName: string;
    generatedAt: string;
  };

  summary: {
    modules: number;
    hotspots: number;
    invariants: number;
    events: number;
  };

  references: {
    moduleActivity?: string;
    hotspots?: string;
    invariants?: string;
    timeline?: string;
  };
};