export type SemanticConcept = {
  id: string;

  keywords: string[];

  relatedConcepts: string[];

  modules: string[];

  artifactKeywords: string[];
};

export const SEMANTIC_CONCEPTS: SemanticConcept[] = [
  {
    id: "architecture",
    keywords: [
      "architecture",
      "boundary",
      "layer",
      "dependency",
      "invariant",
      "coupling",
    ],
    relatedConcepts: ["hotspots", "ownership"],
    modules: ["core", "knowledge", "outputs"],
    artifactKeywords: ["architecture", "invariant", "dependency"],
  },

  {
    id: "hotspots",
    keywords: [
      "hotspot",
      "risk",
      "coupling",
      "instability",
      "volatility",
      "refactor",
    ],
    relatedConcepts: ["architecture", "timeline"],
    modules: ["core", "knowledge"],
    artifactKeywords: ["hotspot", "risk", "coupling"],
  },

  {
    id: "timeline",
    keywords: [
      "timeline",
      "history",
      "evolution",
      "phase",
      "drift",
      "bootstrap",
    ],
    relatedConcepts: ["architecture", "hotspots"],
    modules: ["core", "knowledge"],
    artifactKeywords: ["timeline", "history", "evolution"],
  },

  {
    id: "ownership",
    keywords: [
      "ownership",
      "author",
      "expertise",
      "collaboration",
      "reviewer",
      "bus-factor",
    ],
    relatedConcepts: ["hotspots", "graph"],
    modules: ["knowledge", "core"],
    artifactKeywords: ["author", "ownership", "expertise"],
  },

  {
    id: "graph",
    keywords: [
      "graph",
      "relation",
      "entity",
      "projection",
      "inference",
      "ontology",
    ],
    relatedConcepts: ["ownership", "architecture"],
    modules: ["knowledge", "core"],
    artifactKeywords: ["graph", "entity", "relation", "ontology"],
  },

  {
    id: "connectors",
    keywords: [
      "connector",
      "github",
      "jira",
      "gitlab",
      "linear",
      "slack",
      "sentry",
      "api",
      "ingestion",
    ],
    relatedConcepts: [],
    modules: ["connectors"],
    artifactKeywords: ["connector", "api", "ingestion"],
  },

  {
    id: "outputs",
    keywords: [
      "report",
      "skill",
      "context",
      "markdown",
      "renderer",
      "agent",
    ],
    relatedConcepts: ["architecture"],
    modules: ["outputs"],
    artifactKeywords: ["report", "skill", "context"],
  },
];