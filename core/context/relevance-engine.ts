import { ContextArtifact } from "./context-artifact";
import { semanticRetrieval } from "./semantic-retrieval";

export type RankedContextArtifact = ContextArtifact & {
  relevanceScore: number;
  matchedKeywords: string[];
  matchedModules: string[];
  matchedSemanticConcepts: string[];
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

  const semantic = semanticRetrieval(task);
  const semanticModules = new Set(semantic.modules);
  const semanticArtifactKeywords = new Set(
    semantic.artifactKeywords.map((keyword) => keyword.toLowerCase())
  );

  return artifacts
    .map((artifact) => {
      const matchedKeywords = artifact.keywords.filter((keyword) => {
        const normalizedKeyword = keyword.toLowerCase();

        return (
          taskTokens.has(normalizedKeyword) ||
          semanticArtifactKeywords.has(normalizedKeyword)
        );
      });

      const matchedModules = artifact.modules.filter(
        (module) => taskModules.has(module) || semanticModules.has(module)
      );

      const matchedSemanticConcepts = semantic.concepts.filter((concept) =>
        artifact.keywords.some((keyword) =>
          keyword.toLowerCase().includes(concept.toLowerCase())
        )
      );

      let score = 0;

      score += matchedKeywords.length * 0.12;
      score += matchedModules.length * 0.28;
      score += matchedSemanticConcepts.length * 0.2;

      if (artifact.type === "agent-context") score += 0.12;
      if (artifact.type === "context-pack" && matchedModules.length > 0) {
        score += 0.25;
      }
      if (artifact.type === "skill" && matchedKeywords.length > 0) {
        score += 0.18;
      }
      if (artifact.type === "report" && matchedKeywords.length > 0) {
        score += 0.08;
      }

      return {
        ...artifact,
        relevanceScore: Math.min(1, Math.round(score * 100) / 100),
        matchedKeywords,
        matchedModules,
        matchedSemanticConcepts,
      };
    })
    .filter((artifact) => artifact.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}