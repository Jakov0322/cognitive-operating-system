import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { OwnershipGraph } from "../../knowledge/schemas/ownership-graph";
import { confidenceFromWeightedCount } from "../shared/confidence";
import { knowledgeDir } from "../shared/workspace";

type ExpertiseProfile = {
  personId: string;
  strongestModules: {
    moduleId: string;
    score: number;
  }[];
  ownershipConfidence: {
    score: number;
    level: "low" | "medium" | "high";
  };
  evidenceIds: string[];
};

async function latestJsonFile(dir: string): Promise<string> {
  const files = await readdir(dir);

  const latest = files
    .filter((file) => file.endsWith(".json"))
    .sort()
    .reverse()[0];

  if (!latest) {
    throw new Error(`No JSON files found in ${dir}`);
  }

  return join(dir, latest);
}

function label(id: string): string {
  return id.replace(/^person\./, "").replace(/^module\./, "");
}

async function main() {
  const expertiseFile = await latestJsonFile(
    knowledgeDir("projections", "expertise")
  );

  const profiles = JSON.parse(
    await readFile(expertiseFile, "utf8")
  ) as ExpertiseProfile[];

  const nodes = new Map<string, OwnershipGraph["nodes"][number]>();
  const edges: OwnershipGraph["edges"] = [];

  for (const profile of profiles) {
    nodes.set(profile.personId, {
      id: profile.personId,
      type: "person",
      label: label(profile.personId),
    });

    for (const module of profile.strongestModules) {
      nodes.set(module.moduleId, {
        id: module.moduleId,
        type: "module",
        label: label(module.moduleId),
      });

      const edgeConfidence = confidenceFromWeightedCount(module.score);

      edges.push({
        from: profile.personId,
        to: module.moduleId,
        type: module.score >= 8 ? "owns" : "contributes_to",
        weight: module.score,
        confidence: edgeConfidence,
        evidenceIds: profile.evidenceIds,
      });
    }
  }

  const graph: OwnershipGraph = {
    id: `ownership-graph.${Date.now()}`,
    generatedAt: new Date().toISOString(),
    nodes: Array.from(nodes.values()),
    edges: edges.sort((a, b) => b.weight - a.weight),
  };

  const outputDir = knowledgeDir("projections", "ownership-graph");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, `ownership-graph-${Date.now()}.json`);

  await writeFile(outputPath, JSON.stringify(graph, null, 2), "utf8");

  console.log(`Ownership graph nodes: ${graph.nodes.length}`);
  console.log(`Ownership graph edges: ${graph.edges.length}`);
  console.log(`Saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});