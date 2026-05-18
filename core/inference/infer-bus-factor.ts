import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { BusFactorRisk } from "../../knowledge/schemas/bus-factor";
import { confidenceFromWeightedCount } from "../shared/confidence";

type OwnershipGraph = {
  edges: {
    from: string;
    to: string;
    type: "owns" | "contributes_to";
    weight: number;
    confidence: {
      score: number;
      level: "low" | "medium" | "high";
    };
    evidenceIds: string[];
  }[];
};

async function latestJsonFile(dir: string): Promise<string> {
  const files = await readdir(dir);
  const latest = files.filter((file) => file.endsWith(".json")).sort().reverse()[0];

  if (!latest) {
    throw new Error(`No JSON files found in ${dir}`);
  }

  return join(dir, latest);
}

function riskLevel(busFactor: number): "low" | "medium" | "high" {
  if (busFactor <= 1) return "high";
  if (busFactor === 2) return "medium";
  return "low";
}

async function main() {
  const root = process.cwd();

  const graphFile = await latestJsonFile(
    join(root, "knowledge", "projections", "ownership-graph")
  );

  const graph = JSON.parse(await readFile(graphFile, "utf8")) as OwnershipGraph;

  const byModule = new Map<
    string,
    {
      owners: string[];
      contributors: string[];
      totalWeight: number;
      evidenceIds: Set<string>;
    }
  >();

  for (const edge of graph.edges) {
    if (!byModule.has(edge.to)) {
      byModule.set(edge.to, {
        owners: [],
        contributors: [],
        totalWeight: 0,
        evidenceIds: new Set(),
      });
    }

    const entry = byModule.get(edge.to)!;

    if (edge.type === "owns") {
      entry.owners.push(edge.from);
    } else {
      entry.contributors.push(edge.from);
    }

    entry.totalWeight += edge.weight;

    for (const evidenceId of edge.evidenceIds ?? []) {
      entry.evidenceIds.add(evidenceId);
    }
  }

  const risks: BusFactorRisk[] = [];

  for (const [moduleId, data] of byModule.entries()) {
    const uniquePeople = Array.from(
      new Set([...data.owners, ...data.contributors])
    );

    const busFactor = uniquePeople.length;

    risks.push({
      moduleId,
      busFactor,
      riskLevel: riskLevel(busFactor),
      primaryOwners: data.owners,
      contributors: data.contributors,
      confidence: confidenceFromWeightedCount(data.totalWeight),
      evidenceIds: Array.from(data.evidenceIds),
      inferredAt: new Date().toISOString(),
    });
  }

  const outputDir = join(root, "knowledge", "projections", "bus-factor");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, `bus-factor-${Date.now()}.json`);

  await writeFile(outputPath, JSON.stringify(risks, null, 2), "utf8");

  console.log(`Inferred bus factor risks: ${risks.length}`);
  console.log(`Saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});