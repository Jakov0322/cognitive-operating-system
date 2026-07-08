import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

import { knowledgeDir, outputsDir } from "../../core/shared/workspace";

type OwnershipGraph = {
  nodes: {
    id: string;
    type: "person" | "module";
    label: string;
  }[];
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

function renderMarkdown(graph: OwnershipGraph): string {
  const lines: string[] = [];

  lines.push("# Ownership Graph Report");
  lines.push("");
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`Nodes: ${graph.nodes.length}`);
  lines.push(`Edges: ${graph.edges.length}`);
  lines.push("");

  lines.push("| Person | Relation | Module | Weight | Confidence |");
  lines.push("|---|---|---|---:|---|");

  for (const edge of graph.edges) {
    lines.push(
      `| ${label(edge.from)} | ${edge.type} | ${label(edge.to)} | ${edge.weight} | ${edge.confidence.level} (${edge.confidence.score}) |`
    );
  }

  lines.push("");
  lines.push("## Agent Guidance");
  lines.push("");
  lines.push("- Use ownership graph when assigning review or choosing who/what context to inspect.");
  lines.push("- Treat low-confidence ownership as a weak signal, not a fact.");
  lines.push("- Combine ownership with hotspot risk before making major refactors.");

  return lines.join("\n");
}

async function main() {
  const graphFile = await latestJsonFile(
    knowledgeDir("projections", "ownership-graph")
  );

  const graph = JSON.parse(await readFile(graphFile, "utf8")) as OwnershipGraph;

  const outputDir = outputsDir("reports");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, "ownership-graph.md");

  await writeFile(outputPath, renderMarkdown(graph), "utf8");

  console.log(`Saved report to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});