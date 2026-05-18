import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

type ExpertiseProfile = {
  personId: string;
  strongestModules: { moduleId: string; score: number }[];
  expertiseAreas: string[];
  ownershipConfidence: { score: number; level: "low" | "medium" | "high" };
};

type BusFactorRisk = {
  moduleId: string;
  busFactor: number;
  riskLevel: "low" | "medium" | "high";
  primaryOwners: string[];
  contributors: string[];
  confidence: { score: number; level: "low" | "medium" | "high" };
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

function renderSkill(expertise: ExpertiseProfile[], busFactor: BusFactorRisk[]): string {
  const lines: string[] = [];

  lines.push("# Human Cognition Skill");
  lines.push("");
  lines.push("## Purpose");
  lines.push("");
  lines.push(
    "Use this skill when reasoning about ownership, expertise, review risk, collaboration, or bus factor."
  );
  lines.push("");

  lines.push("## Agent Rules");
  lines.push("");
  lines.push("- Treat ownership as an inferred signal, not an absolute fact.");
  lines.push("- Do not assume a person is the only valid reviewer based only on git history.");
  lines.push("- Combine ownership with hotspot and architecture context before large refactors.");
  lines.push("- Be extra careful in high bus-factor-risk modules.");
  lines.push("- Prefer smaller changes when expertise is concentrated in one person.");
  lines.push("");

  lines.push("## Expertise Profiles");
  lines.push("");

  if (expertise.length === 0) {
    lines.push("- No expertise profiles inferred.");
  } else {
    for (const profile of expertise) {
      lines.push(`### ${label(profile.personId)}`);
      lines.push("");
      lines.push(
        `- Ownership confidence: ${profile.ownershipConfidence.level} (${profile.ownershipConfidence.score})`
      );
      lines.push(`- Expertise areas: ${profile.expertiseAreas.join(", ") || "-"}`);
      lines.push(
        `- Strongest modules: ${
          profile.strongestModules
            .map((item) => `${label(item.moduleId)}:${item.score}`)
            .join(", ") || "-"
        }`
      );
      lines.push("");
    }
  }

  lines.push("## Bus Factor Risks");
  lines.push("");

  const sortedRisks = [...busFactor].sort((a, b) => {
    const order = { high: 3, medium: 2, low: 1 };
    return order[b.riskLevel] - order[a.riskLevel];
  });

  if (sortedRisks.length === 0) {
    lines.push("- No bus factor risks inferred.");
  } else {
    for (const risk of sortedRisks) {
      lines.push(`### ${label(risk.moduleId)}`);
      lines.push("");
      lines.push(`- Bus factor: ${risk.busFactor}`);
      lines.push(`- Risk: ${risk.riskLevel}`);
      lines.push(`- Confidence: ${risk.confidence.level} (${risk.confidence.score})`);
      lines.push(`- Primary owners: ${risk.primaryOwners.map(label).join(", ") || "-"}`);
      lines.push(`- Contributors: ${risk.contributors.map(label).join(", ") || "-"}`);
      lines.push("");
    }
  }

  lines.push("## Related Context");
  lines.push("");
  lines.push("- `outputs/reports/expertise.md`");
  lines.push("- `outputs/reports/ownership-graph.md`");
  lines.push("- `outputs/reports/bus-factor.md`");
  lines.push("- `outputs/skills/risk-hotspots/SKILL.md`");
  lines.push("- `outputs/skills/architecture/SKILL.md`");

  return lines.join("\n");
}

async function main() {
  const root = process.cwd();

  const expertiseFile = await latestJsonFile(
    join(root, "knowledge", "projections", "expertise")
  );

  const busFactorFile = await latestJsonFile(
    join(root, "knowledge", "projections", "bus-factor")
  );

  const expertise = JSON.parse(await readFile(expertiseFile, "utf8")) as ExpertiseProfile[];
  const busFactor = JSON.parse(await readFile(busFactorFile, "utf8")) as BusFactorRisk[];

  const outputDir = join(root, "outputs", "skills", "human-cognition");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, "SKILL.md");

  await writeFile(outputPath, renderSkill(expertise, busFactor), "utf8");

  console.log(`Saved skill to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});