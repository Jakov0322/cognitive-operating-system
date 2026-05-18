import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { ArchitecturalInvariant } from "../../knowledge/schemas/architectural-invariant";
import { confidence } from "../shared/confidence";

function inferArchitecturalInvariants(): ArchitecturalInvariant[] {
  const now = new Date().toISOString();

  return [
    {
      id: "invariant.connectors-do-not-own-inference",
      type: "forbidden_dependency",
      description:
        "Connectors should collect raw signals and must not own inference, projection, or final agent-context generation logic.",
      sourceModules: ["module.connectors"],
      targetModules: ["module.core", "module.outputs"],
      confidence: confidence(0.8),
      evidenceIds: [],
      metadata: {
        rule: "connectors are ingestion-only",
        forbiddenResponsibilities: ["inference", "projection", "agent-context-rendering"],
      },
      inferredAt: now,
    },
    {
      id: "invariant.core-owns-cognition",
      type: "ownership_boundary",
      description:
        "Core owns normalization, extraction, timeline construction, inference, relevance ranking, compression, and orchestration.",
      sourceModules: ["module.core"],
      confidence: confidence(0.85),
      evidenceIds: [],
      metadata: {
        ownedResponsibilities: [
          "normalization",
          "entity-extraction",
          "relation-extraction",
          "timeline",
          "inference",
          "context-ranking",
          "context-compression",
          "orchestration",
        ],
      },
      inferredAt: now,
    },
    {
      id: "invariant.knowledge-is-machine-memory",
      type: "ownership_boundary",
      description:
        "Knowledge stores durable machine-readable memory such as events, graph data, projections, schemas, ontology, and evidence.",
      sourceModules: ["module.knowledge"],
      confidence: confidence(0.85),
      evidenceIds: [],
      metadata: {
        ownedResponsibilities: [
          "events",
          "graph",
          "projections",
          "schemas",
          "ontology",
          "evidence",
        ],
      },
      inferredAt: now,
    },
    {
      id: "invariant.outputs-are-generated-context",
      type: "generated_zone",
      description:
        "Outputs contains generated human-facing and agent-facing artifacts. Generated reports, skills, and context packs should not be treated as source memory.",
      sourceModules: ["module.outputs"],
      confidence: confidence(0.9),
      evidenceIds: [],
      metadata: {
        generatedArtifacts: ["reports", "skills", "context-packs", "agent-context"],
      },
      inferredAt: now,
    },
    {
      id: "invariant.no-raw-api-parsing-in-outputs",
      type: "forbidden_dependency",
      description:
        "Outputs should render from projections, inference, or structured context artifacts, not directly from raw external APIs.",
      sourceModules: ["module.outputs"],
      targetModules: ["module.connectors"],
      confidence: confidence(0.8),
      evidenceIds: [],
      metadata: {
        rule: "outputs render structured knowledge, not raw external APIs",
      },
      inferredAt: now,
    },
  ];
}

async function main() {
  const root = process.cwd();

  const invariants = inferArchitecturalInvariants();

  const outputDir = join(root, "knowledge", "projections", "architectural-invariants");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, `architectural-invariants-${Date.now()}.json`);

  await writeFile(outputPath, JSON.stringify(invariants, null, 2), "utf8");

  console.log(`Inferred architectural invariants: ${invariants.length}`);
  console.log(`Saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});