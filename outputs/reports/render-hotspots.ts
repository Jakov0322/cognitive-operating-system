import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

type HotspotReason =
  | "high_change_frequency"
  | "high_module_coupling"
  | "multiple_authors";

type ModuleHotspot = {
  moduleId: string;
  hotspotScore: number;
  reasons: HotspotReason[];
  metrics: {
    changeCount: number;
    authorCount: number;
    relatedModuleCount: number;
  };
  evidenceIds: string[];
  inferredAt: string;
};

function moduleName(moduleId: string): string {
  return moduleId.replace(/^module\./, "");
}

function reasonLabel(reason: HotspotReason): string {
  const labels: Record<HotspotReason, string> = {
    high_change_frequency: "High change frequency",
    high_module_coupling: "High module coupling",
    multiple_authors: "Multiple authors",
  };

  return labels[reason];
}

function riskLevel(score: number): "High" | "Medium" | "Low" {
  if (score >= 0.8) return "High";
  if (score >= 0.5) return "Medium";
  return "Low";
}

function renderMarkdown(items: ModuleHotspot[]): string {
  const lines: string[] = [];

  lines.push("# Hotspot Report");
  lines.push("");
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`Tracked hotspots: ${items.length}`);
  lines.push("");

  lines.push("| Module | Score | Risk | Reasons |");
  lines.push("|---|---:|---|---|");

  for (const item of items) {
    lines.push(
      `| ${moduleName(item.moduleId)} | ${item.hotspotScore} | ${riskLevel(
        item.hotspotScore
      )} | ${item.reasons.map(reasonLabel).join(", ") || "-"} |`
    );
  }

  lines.push("");
  lines.push("## Details");
  lines.push("");

  for (const item of items) {
    lines.push(`### ${moduleName(item.moduleId)}`);
    lines.push("");
    lines.push(`- Hotspot score: ${item.hotspotScore}`);
    lines.push(`- Risk level: ${riskLevel(item.hotspotScore)}`);
    lines.push(
      `- Reasons: ${item.reasons.map(reasonLabel).join(", ") || "-"}`
    );
    lines.push(`- Change count: ${item.metrics.changeCount}`);
    lines.push(`- Author count: ${item.metrics.authorCount}`);
    lines.push(`- Related module count: ${item.metrics.relatedModuleCount}`);
    lines.push(`- Evidence count: ${item.evidenceIds.length}`);
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const repositoryPath = process.cwd();
  const hotspotsFile = process.argv[2];

  if (!hotspotsFile) {
    throw new Error("Provide hotspots projection file path as argument");
  }

  const raw = await readFile(hotspotsFile, "utf8");
  const items = JSON.parse(raw) as ModuleHotspot[];

  const outputDir = join(repositoryPath, "outputs", "reports");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, "hotspots.md");

  await writeFile(outputPath, renderMarkdown(items), "utf8");

  console.log(`Saved report to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});