import { ContextArtifact } from "./context-artifact";
import { semanticRetrieval } from "./semantic-retrieval";

export type RankedContextArtifact = ContextArtifact & {
  relevanceScore: number;
  matchedKeywords: string[];
  matchedModules: string[];
  semanticScore: number;
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
      "embedding",
      "embeddings",
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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function rankArtifacts(
  task: string,
  artifacts: ContextArtifact[]
): Promise<RankedContextArtifact[]> {
  const taskTokens = new Set(tokenize(task));
  const taskModules = new Set(detectModules(task));

  const semantic = await semanticRetrieval(task);
  const semanticScoreByPath = new Map(
    semantic.matches.map((match) => [match.path, match.score])
  );
  const semanticModules = new Set(semantic.modules);

  return artifacts
    .map((artifact) => {
      const matchedKeywords = artifact.keywords.filter((keyword) =>
        taskTokens.has(keyword.toLowerCase())
      );

      const matchedModules = artifact.modules.filter(
        (module) => taskModules.has(module) || semanticModules.has(module)
      );

      const semanticScore = semanticScoreByPath.get(artifact.path) ?? 0;

      let score = semanticScore * 0.75;
      score += Math.min(matchedKeywords.length * 0.05, 0.15);
      score += Math.min(matchedModules.length * 0.08, 0.16);

      return {
        ...artifact,
        relevanceScore: Math.min(1, round(score)),
        matchedKeywords,
        matchedModules,
        semanticScore: round(semanticScore),
      };
    })
    .filter((artifact) => artifact.relevanceScore > 0.15)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}
