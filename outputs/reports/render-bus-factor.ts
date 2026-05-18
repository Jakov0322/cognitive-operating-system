import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

type BusFactorRisk = {
  moduleId: string;
  busFactor: number;
  riskLevel: "low" | "medium" | "high";
  primaryOwners: string[];
  contributors: string[];
  confidence: {
    score: number;
    level: "low" | "medium" | "high";
  };
  evidenceIds: string[];
  inferredAt: string;
};

async function latestJsonFile(dir: string): Promise<string> {
  const files = await readdir(dir);
  const latest = files.filter((file) => file.endsWith(".json")).sort().reverse()[0];

  if (!latest) {
    throw new Error(`No JSON files found in ${dir}`);
  }

  return join(dir, latest);
}

function label(id: string): string {
  return id.replace(/^person\./, "").replace(/^module\./, "");
}

function renderMarkdown(risks: BusFactorRisk[]): string {
  const sorted = [...risks].sort((a, b) => {
    const order = { high: 3, medium: 2, low: 1 };
    return order[b.riskLevel] - order[a.riskLevel];
  });

  const lines: string[] = [];

  lines.push("# Bus Factor Report");
  lines.push("");
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Module | Bus factor | Risk | Confidence | Owners | Contributors |");
  lines.push("|---|---:|---|---|---|---|");

  for (const risk of sorted) {
    lines.push(
      `| ${label(risk.moduleId)} | ${risk.busFactor} | ${risk.riskLevel} | ${risk.confidence.level} (${risk.confidence.score}) | ${risk.primaryOwners.map(label).join(", ") || "-"} | ${risk.contributors.map(label).join(", ") || "-"} |`
    );
  }

  lines.push("");
  lines.push("## Agent Guidance");
  lines.push("");
  lines.push("- Treat high bus factor risk as a warning before large refactors.");
  lines.push("- Prefer stronger tests and smaller changes in single-owner modules.");
  lines.push("- Combine this report with hotspot and ownership reports.");
  lines.push("- Do not overinterpret low-confidence ownership signals.");

  return lines.join("\n");
}

async function main() {
  const root = process.cwd();

  const busFactorFile = await latestJsonFile(
    join(root, "knowledge", "projections", "bus-factor")
  );

  const risks = JSON.parse(await readFile(busFactorFile, "utf8")) as BusFactorRisk[];

  const outputDir = join(root, "outputs", "reports");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, "bus-factor.md");

  await writeFile(outputPath, renderMarkdown(risks), "utf8");

  console.log(`Saved report to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});