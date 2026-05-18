import { SEMANTIC_CONCEPTS } from "./semantic-taxonomy";

export type SemanticRetrievalResult = {
  concepts: string[];
  modules: string[];
  artifactKeywords: string[];
};

export function semanticRetrieval(
  task: string
): SemanticRetrievalResult {
  const normalized = task.toLowerCase();

  const concepts = new Set<string>();
  const modules = new Set<string>();
  const artifactKeywords = new Set<string>();

  for (const concept of SEMANTIC_CONCEPTS) {
    const matched = concept.keywords.some((keyword) =>
      normalized.includes(keyword.toLowerCase())
    );

    if (!matched) continue;

    concepts.add(concept.id);

    for (const related of concept.relatedConcepts) {
      concepts.add(related);
    }

    for (const module of concept.modules) {
      modules.add(module);
    }

    for (const keyword of concept.artifactKeywords) {
      artifactKeywords.add(keyword);
    }
  }

  return {
    concepts: Array.from(concepts),
    modules: Array.from(modules),
    artifactKeywords: Array.from(artifactKeywords),
  };
}