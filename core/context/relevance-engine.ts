import { ContextArtifact } from "./context-artifact";

export type RankedContextArtifact = ContextArtifact & {
  relevanceScore: number;
  matchedKeywords: string[];
  matchedModules: string[];
};

function normalize(text: string): string {
  return text.toLowerCase();
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9_-]+/i)
    .map((token) => token.trim())
    .filter(Boolean);
}

function detectModules(task: string): string[] {
  const text = normalize(task);

  const moduleKeywords: Record<string, string[]> = {
    connectors: [
      "connector",
      "connectors",
      "github",
      "gitlab",
      "jira",
      "linear",
      "slack",
      "discord",
      "sentry",
      "notion",
      "api",
      "ingestion",
      "fetch",
    ],
    core: [
      "core",
      "extract",
      "extraction",
      "relation",
      "entity",
      "infer",
      "inference",
      "timeline",
      "orchestration",
      "normalize",
      "normalization",
      "relevance",
      "ranking",
    ],
    knowledge: [
      "knowledge",
      "schema",
      "schemas",
      "ontology",
      "graph",
      "events",
      "evidence",
      "projection",
      "projections",
      "memory",
    ],
    outputs: [
      "output",
      "outputs",
      "report",
      "reports",
      "skill",
      "skills",
      "markdown",
      "context",
      "agent",
      "agents",
      "onboarding",
      "renderer",
      "render",
    ],
  };

  const matches = new Set<string>();

  for (const [module, keywords] of Object.entries(moduleKeywords)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      matches.add(module);
    }
  }

  return Array.from(matches);
}

export function rankArtifacts(
  task: string,
  artifacts: ContextArtifact[]
): RankedContextArtifact[] {
  const taskTokens = new Set(tokenize(task));
  const taskModules = new Set(detectModules(task));

  return artifacts
    .map((artifact) => {
      const matchedKeywords = artifact.keywords.filter((keyword) =>
        taskTokens.has(keyword.toLowerCase())
      );

      const matchedModules = artifact.modules.filter((module) =>
        taskModules.has(module)
      );

      let score = 0;

      score += matchedKeywords.length * 0.15;
      score += matchedModules.length * 0.35;

      if (artifact.type === "agent-context") score += 0.15;
      if (artifact.type === "context-pack" && matchedModules.length > 0) score += 0.25;
      if (artifact.type === "skill" && matchedKeywords.length > 0) score += 0.2;

      return {
        ...artifact,
        relevanceScore: Math.min(1, Math.round(score * 100) / 100),
        matchedKeywords,
        matchedModules,
      };
    })
    .filter((artifact) => artifact.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}