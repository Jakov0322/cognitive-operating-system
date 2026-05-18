import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

type ModuleHotspot = {
  moduleId: string;
  hotspotScore: number;
  confidence?: {
    score: number;
    level: string;
  };
  reasons: string[];
  metrics: {
    changeCount: number;
    authorCount: number;
    relatedModuleCount: number;
  };
};

function moduleName(moduleId: string): string {
  return moduleId.replace(/^module\./, "");
}

function riskLevel(score: number): string {
  if (score >= 0.75) return "HIGH";
  if (score >= 0.45) return "MEDIUM";
  return "LOW";
}

function reasonLabel(reason: string): string {
  return reason.replace(/_/g, " ");
}

function renderSkill(hotspots: ModuleHotspot[]): string {
  const lines: string[] = [];

  lines.push("# Risk Hotspots Skill");
  lines.push("");
  lines.push("## Purpose");
  lines.push("");
  lines.push(
    "Use this skill before modifying modules with high architectural volatility, coupling, or ownership complexity."
  );
  lines.push("");

  lines.push("## Agent Rules");
  lines.push("");
  lines.push("- Read hotspot context before large refactors.");
  lines.push("- Prefer incremental changes in high-risk modules.");
  lines.push("- Avoid unrelated modifications in hotspot areas.");
  lines.push("- Preserve existing architectural boundaries.");
  lines.push("- Inspect related modules before changing coupled modules.");
  lines.push("");

  lines.push("## Hotspots");
  lines.push("");

  for (const hotspot of hotspots) {
    lines.push(`### ${moduleName(hotspot.moduleId)}`);
    lines.push("");

    lines.push(`- Risk: ${riskLevel(hotspot.hotspotScore)}`);
    lines.push(`- Score: ${hotspot.hotspotScore}`);

    if (hotspot.confidence) {
      lines.push(
        `- Confidence: ${hotspot.confidence.level} (${hotspot.confidence.score})`
      );
    }

    lines.push(
      `- Reasons: ${
        hotspot.reasons.map(reasonLabel).join(", ") || "none"
      }`
    );

    lines.push(`- Change count: ${hotspot.metrics.changeCount}`);
    lines.push(`- Author count: ${hotspot.metrics.authorCount}`);
    lines.push(
      `- Related modules: ${hotspot.metrics.relatedModuleCount}`
    );

    lines.push("");
  }

  lines.push("## Usage");
  lines.push("");
  lines.push(
    "Consult this skill before editing modules with HIGH or MEDIUM risk."
  );

  return lines.join("\n");
}

async function latestHotspotFile(dir: string): Promise<string> {
  const files = await readFile;
  return dir;
}

async function main() {
  const root = process.cwd();

  const hotspotsDir = join(
    root,
    "knowledge",
    "projections",
    "hotspots"
  );

  const files = await (await import("node:fs/promises")).readdir(hotspotsDir);

  const latest = files
    .filter((file) => file.endsWith(".json"))
    .sort()
    .reverse()[0];

  if (!latest) {
    throw new Error("No hotspot projection found");
  }

  const raw = await readFile(join(hotspotsDir, latest), "utf8");

  const hotspots = JSON.parse(raw) as ModuleHotspot[];

  const outputDir = join(root, "outputs", "skills", "risk-hotspots");

  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, "SKILL.md");

  await writeFile(outputPath, renderSkill(hotspots), "utf8");

  console.log(`Saved skill to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});