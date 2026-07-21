import { ArchitecturalInvariant } from "../../knowledge/schemas/architectural-invariant";
import { BusFactorRisk } from "../../knowledge/schemas/bus-factor";
import { ExpertiseProfile } from "../../knowledge/schemas/expertise-profile";
import { shouldIgnoreForModuleInference } from "../shared/path-filters";

export type RiskLevel = "low" | "medium" | "high";

export type ChangeRiskHotspot = {
  moduleId: string;
  hotspotScore: number;
  riskLevel: RiskLevel;
  reasons: string[];
};

export type ChangeRiskExpert = {
  personId: string;
  score: number;
};

export type ModuleRiskSummary = {
  moduleId: string;
  hotspot: ChangeRiskHotspot | null;
  busFactor: BusFactorRisk | null;
  relevantInvariants: ArchitecturalInvariant[];
  experts: ChangeRiskExpert[];
};

export type ChangeRiskReport = {
  files: string[];
  touchedModules: string[];
  ignoredFiles: string[];
  overallRiskLevel: RiskLevel;
  modules: ModuleRiskSummary[];
};

const RISK_RANK: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };

function inferModuleName(filePath: string): string | null {
  const segments = filePath.split(/[\\/]/).filter(Boolean);

  if (segments.length === 0) return null;
  if (segments[0] === "src" && segments.length > 1) return segments[1];
  if (segments[0] === "apps" && segments.length > 1) return segments[1];
  if (segments[0] === "packages" && segments.length > 1) return segments[1];

  return segments[0];
}

function hotspotRiskLevel(score: number): RiskLevel {
  if (score >= 0.8) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}

function maxRiskLevel(levels: RiskLevel[]): RiskLevel {
  return levels.reduce<RiskLevel>(
    (highest, level) => (RISK_RANK[level] > RISK_RANK[highest] ? level : highest),
    "low"
  );
}

export function checkChangeRisk(
  files: string[],
  data: {
    hotspots: { moduleId: string; hotspotScore: number; reasons: string[] }[];
    busFactorRisks: BusFactorRisk[];
    invariants: ArchitecturalInvariant[];
    expertiseProfiles: ExpertiseProfile[];
  }
): ChangeRiskReport {
  const touchedModuleIds = new Set<string>();
  const ignoredFiles: string[] = [];

  for (const file of files) {
    if (shouldIgnoreForModuleInference(file)) {
      ignoredFiles.push(file);
      continue;
    }

    const moduleName = inferModuleName(file);

    if (!moduleName) {
      ignoredFiles.push(file);
      continue;
    }

    touchedModuleIds.add(`module.${moduleName}`);
  }

  const modules: ModuleRiskSummary[] = Array.from(touchedModuleIds)
    .sort()
    .map((moduleId) => {
      const hotspotRecord = data.hotspots.find((h) => h.moduleId === moduleId);
      const hotspot: ChangeRiskHotspot | null = hotspotRecord
        ? {
            moduleId,
            hotspotScore: hotspotRecord.hotspotScore,
            riskLevel: hotspotRiskLevel(hotspotRecord.hotspotScore),
            reasons: hotspotRecord.reasons,
          }
        : null;

      const busFactor =
        data.busFactorRisks.find((risk) => risk.moduleId === moduleId) ?? null;

      const relevantInvariants = data.invariants.filter(
        (invariant) =>
          invariant.sourceModules.includes(moduleId) ||
          (invariant.targetModules ?? []).includes(moduleId)
      );

      const experts: ChangeRiskExpert[] = data.expertiseProfiles
        .flatMap((profile) =>
          profile.strongestModules
            .filter((m) => m.moduleId === moduleId)
            .map((m) => ({ personId: profile.personId, score: m.score }))
        )
        .sort((a, b) => b.score - a.score);

      return { moduleId, hotspot, busFactor, relevantInvariants, experts };
    });

  const riskLevels = modules.flatMap((module) => {
    const levels: RiskLevel[] = [];
    if (module.hotspot) levels.push(module.hotspot.riskLevel);
    if (module.busFactor) levels.push(module.busFactor.riskLevel);
    return levels;
  });

  return {
    files,
    touchedModules: Array.from(touchedModuleIds).sort(),
    ignoredFiles,
    overallRiskLevel: maxRiskLevel(riskLevels),
    modules,
  };
}
