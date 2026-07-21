import { describe, expect, it } from "vitest";
import { checkChangeRisk } from "./check-change-risk";
import { BusFactorRisk } from "../../knowledge/schemas/bus-factor";
import { ArchitecturalInvariant } from "../../knowledge/schemas/architectural-invariant";
import { ExpertiseProfile } from "../../knowledge/schemas/expertise-profile";

function busFactor(overrides: Partial<BusFactorRisk>): BusFactorRisk {
  return {
    moduleId: "module.core",
    busFactor: 1,
    riskLevel: "high",
    primaryOwners: ["person.jane"],
    contributors: [],
    confidence: { score: 0.9, level: "high" },
    evidenceIds: [],
    inferredAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function invariant(overrides: Partial<ArchitecturalInvariant>): ArchitecturalInvariant {
  return {
    id: "invariant.test",
    type: "ownership_boundary",
    description: "test invariant",
    sourceModules: ["module.core"],
    confidence: { score: 0.8, level: "high" },
    evidenceIds: [],
    inferredAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function expertiseProfile(overrides: Partial<ExpertiseProfile>): ExpertiseProfile {
  return {
    personId: "person.jane",
    strongestModules: [{ moduleId: "module.core", score: 10 }],
    expertiseAreas: [],
    ownershipConfidence: { score: 0.9, level: "high" },
    evidenceIds: [],
    inferredAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const emptyData = {
  hotspots: [],
  busFactorRisks: [],
  invariants: [],
  expertiseProfiles: [],
};

describe("checkChangeRisk", () => {
  it("returns low overall risk and no modules for an empty file list", () => {
    const report = checkChangeRisk([], emptyData);

    expect(report.touchedModules).toEqual([]);
    expect(report.overallRiskLevel).toBe("low");
  });

  it("routes root config and vendor files into ignoredFiles instead of a module", () => {
    const report = checkChangeRisk(["package.json", "node_modules/x/index.js"], emptyData);

    expect(report.touchedModules).toEqual([]);
    expect(report.ignoredFiles).toEqual(["package.json", "node_modules/x/index.js"]);
  });

  it("infers one module per distinct top-level path segment", () => {
    const report = checkChangeRisk(
      ["core/inference/infer-hotspots.ts", "core/inference/check-change-risk.ts", "outputs/reports/render-hotspots.ts"],
      emptyData
    );

    expect(report.touchedModules).toEqual(["module.core", "module.outputs"]);
  });

  it("attaches hotspot data and derives risk level from score", () => {
    const report = checkChangeRisk(["core/a.ts"], {
      ...emptyData,
      hotspots: [{ moduleId: "module.core", hotspotScore: 0.9, reasons: ["high_change_frequency"] }],
    });

    expect(report.modules[0].hotspot?.riskLevel).toBe("high");
  });

  it("attaches bus factor data when present for the touched module", () => {
    const report = checkChangeRisk(["core/a.ts"], {
      ...emptyData,
      busFactorRisks: [busFactor({ moduleId: "module.core" })],
    });

    expect(report.modules[0].busFactor?.riskLevel).toBe("high");
  });

  it("leaves hotspot and busFactor null when there is no data for the module", () => {
    const report = checkChangeRisk(["core/a.ts"], emptyData);

    expect(report.modules[0].hotspot).toBeNull();
    expect(report.modules[0].busFactor).toBeNull();
  });

  it("surfaces invariants naming the module as either a source or a target", () => {
    const report = checkChangeRisk(["outputs/a.ts"], {
      ...emptyData,
      invariants: [
        invariant({
          id: "invariant.no-raw-api-parsing-in-outputs",
          sourceModules: ["module.outputs"],
          targetModules: ["module.connectors"],
        }),
      ],
    });

    expect(report.modules[0].relevantInvariants.map((i) => i.id)).toEqual([
      "invariant.no-raw-api-parsing-in-outputs",
    ]);
  });

  it("lists experts for a module sorted by descending score", () => {
    const report = checkChangeRisk(["core/a.ts"], {
      ...emptyData,
      expertiseProfiles: [
        expertiseProfile({ personId: "person.bob", strongestModules: [{ moduleId: "module.core", score: 3 }] }),
        expertiseProfile({ personId: "person.jane", strongestModules: [{ moduleId: "module.core", score: 9 }] }),
      ],
    });

    expect(report.modules[0].experts.map((e) => e.personId)).toEqual([
      "person.jane",
      "person.bob",
    ]);
  });

  it("takes the highest risk level across all touched modules for overallRiskLevel", () => {
    const report = checkChangeRisk(["core/a.ts", "outputs/b.ts"], {
      ...emptyData,
      hotspots: [
        { moduleId: "module.core", hotspotScore: 0.9, reasons: [] },
        { moduleId: "module.outputs", hotspotScore: 0.2, reasons: [] },
      ],
    });

    expect(report.overallRiskLevel).toBe("high");
  });
});
