import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { ConfidenceScore } from "../../knowledge/ontology/confidence";
import { confidenceFromWeightedCount } from "../shared/confidence";
import { knowledgeDir } from "../shared/workspace";

type ModuleActivityProjection = {
  moduleId: string;
  changeCount: number;
  authors: string[];
  relatedModules: string[];
  evidenceIds: string[];
  updatedAt: string;
};

type HotspotReason =
  | "high_change_frequency"
  | "high_module_coupling"
  | "multiple_authors";

type ModuleHotspot = {
  moduleId: string;
  hotspotScore: number;
  confidence: ConfidenceScore;
  reasons: HotspotReason[];
  metrics: {
    changeCount: number;
    authorCount: number;
    relatedModuleCount: number;
  };
  evidenceIds: string[];
  inferredAt: string;
};

function normalize(value: number, max: number): number {
  if (max <= 0) return 0;
  return value / max;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function inferHotspots(
  modules: ModuleActivityProjection[]
): ModuleHotspot[] {
  const maxChanges = Math.max(...modules.map((m) => m.changeCount), 0);
  const maxAuthors = Math.max(...modules.map((m) => m.authors.length), 0);
  const maxRelatedModules = Math.max(
    ...modules.map((m) => m.relatedModules.length),
    0
  );

  return modules
    .map((module) => {
      const changeScore = normalize(module.changeCount, maxChanges);
      const authorScore = normalize(module.authors.length, maxAuthors);
      const couplingScore = normalize(
        module.relatedModules.length,
        maxRelatedModules
      );

      const hotspotScore = round(
        changeScore * 0.5 + couplingScore * 0.35 + authorScore * 0.15
      );

      const hotspotConfidence = confidenceFromWeightedCount(
        module.evidenceIds.length
      );

      const reasons: HotspotReason[] = [];

      if (changeScore >= 0.75) reasons.push("high_change_frequency");
      if (couplingScore >= 0.75) reasons.push("high_module_coupling");
      if (module.authors.length > 1) {
        reasons.push("multiple_authors");
      }

      return {
        moduleId: module.moduleId,
        hotspotScore,
        confidence: hotspotConfidence,
        reasons,
        metrics: {
          changeCount: module.changeCount,
          authorCount: module.authors.length,
          relatedModuleCount: module.relatedModules.length,
        },
        evidenceIds: module.evidenceIds,
        inferredAt: new Date().toISOString(),
      };
    })
    .sort((a, b) => b.hotspotScore - a.hotspotScore);
}

async function main() {
  const moduleActivityFile = process.argv[2];

  if (!moduleActivityFile) {
    throw new Error("Provide module activity projection file path as argument");
  }

  const raw = await readFile(moduleActivityFile, "utf8");
  const modules = JSON.parse(raw) as ModuleActivityProjection[];

  const hotspots = inferHotspots(modules);

  const outputDir = knowledgeDir("projections", "hotspots");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, `hotspots-${Date.now()}.json`);

  await writeFile(outputPath, JSON.stringify(hotspots, null, 2), "utf8");

  console.log(`Inferred hotspots: ${hotspots.length}`);
  console.log(`Saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});