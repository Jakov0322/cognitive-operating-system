import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { ArchitecturalInvariant } from "../../knowledge/schemas/architectural-invariant";
import { BusFactorRisk } from "../../knowledge/schemas/bus-factor";
import { ExpertiseProfile } from "../../knowledge/schemas/expertise-profile";
import { checkChangeRisk, ChangeRiskReport } from "../inference/check-change-risk";
import { knowledgeDir, latestJsonFile } from "../shared/workspace";

async function readLatestProjectionOrEmpty<T>(projectionName: string): Promise<T[]> {
  try {
    const file = await latestJsonFile(knowledgeDir("projections", projectionName));
    return JSON.parse(await readFile(file, "utf8")) as T[];
  } catch {
    return [];
  }
}

const RISK_BADGE: Record<ChangeRiskReport["overallRiskLevel"], string> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
};

export function formatChangeRiskReport(report: ChangeRiskReport): string {
  const lines: string[] = [];

  lines.push(`Overall risk: ${RISK_BADGE[report.overallRiskLevel]}`);
  lines.push(`Files: ${report.files.length} (${report.ignoredFiles.length} ignored)`);
  lines.push("");

  if (report.modules.length === 0) {
    lines.push("No modules mapped to the given files.");
    return lines.join("\n");
  }

  for (const module of report.modules) {
    lines.push(`## ${module.moduleId.replace(/^module\./, "")}`);

    if (module.hotspot) {
      lines.push(
        `- Hotspot: score ${module.hotspot.hotspotScore} (${module.hotspot.riskLevel})${
          module.hotspot.reasons.length ? ` — ${module.hotspot.reasons.join(", ")}` : ""
        }`
      );
    } else {
      lines.push("- Hotspot: no data");
    }

    if (module.busFactor) {
      lines.push(
        `- Bus factor: ${module.busFactor.busFactor} (${module.busFactor.riskLevel}) — owners: ${
          module.busFactor.primaryOwners.join(", ") || "none recorded"
        }`
      );
    } else {
      lines.push("- Bus factor: no data");
    }

    if (module.relevantInvariants.length > 0) {
      lines.push("- Invariants:");
      for (const invariant of module.relevantInvariants) {
        lines.push(`  - ${invariant.description}`);
      }
    }

    if (module.experts.length > 0) {
      lines.push(
        `- Experts: ${module.experts.map((e) => e.personId.replace(/^person\./, "")).join(", ")}`
      );
    }

    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const files = process.argv.slice(2);

  if (files.length === 0) {
    throw new Error("Provide at least one file path to check, e.g. cognitive-os check core/a.ts");
  }

  const [hotspots, busFactorRisks, invariants, expertiseProfiles] = await Promise.all([
    readLatestProjectionOrEmpty<{ moduleId: string; hotspotScore: number; reasons: string[] }>("hotspots"),
    readLatestProjectionOrEmpty<BusFactorRisk>("bus-factor"),
    readLatestProjectionOrEmpty<ArchitecturalInvariant>("architectural-invariants"),
    readLatestProjectionOrEmpty<ExpertiseProfile>("expertise"),
  ]);

  const report = checkChangeRisk(files, {
    hotspots,
    busFactorRisks,
    invariants,
    expertiseProfiles,
  });

  console.log(formatChangeRiskReport(report));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
