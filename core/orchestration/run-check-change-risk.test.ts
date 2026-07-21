import { describe, expect, it } from "vitest";
import { formatChangeRiskReport } from "./run-check-change-risk";
import { ChangeRiskReport } from "../inference/check-change-risk";

function report(overrides: Partial<ChangeRiskReport>): ChangeRiskReport {
  return {
    files: ["core/a.ts"],
    touchedModules: ["module.core"],
    ignoredFiles: [],
    overallRiskLevel: "low",
    modules: [],
    ...overrides,
  };
}

describe("formatChangeRiskReport", () => {
  it("prints the overall risk badge and file counts", () => {
    const text = formatChangeRiskReport(report({ overallRiskLevel: "high", files: ["a.ts", "b.ts"], ignoredFiles: ["b.ts"] }));

    expect(text).toContain("Overall risk: HIGH");
    expect(text).toContain("Files: 2 (1 ignored)");
  });

  it("says no modules were mapped when the module list is empty", () => {
    const text = formatChangeRiskReport(report({ modules: [] }));

    expect(text).toContain("No modules mapped");
  });

  it("includes hotspot, bus factor, invariants, and experts for each module", () => {
    const text = formatChangeRiskReport(
      report({
        modules: [
          {
            moduleId: "module.core",
            hotspot: { moduleId: "module.core", hotspotScore: 0.9, riskLevel: "high", reasons: ["high_change_frequency"] },
            busFactor: {
              moduleId: "module.core",
              busFactor: 1,
              riskLevel: "high",
              primaryOwners: ["person.jane"],
              contributors: [],
              confidence: { score: 0.9, level: "high" },
              evidenceIds: [],
              inferredAt: "2026-01-01T00:00:00.000Z",
            },
            relevantInvariants: [
              {
                id: "invariant.x",
                type: "ownership_boundary",
                description: "Core owns cognition",
                sourceModules: ["module.core"],
                confidence: { score: 0.8, level: "high" },
                evidenceIds: [],
                inferredAt: "2026-01-01T00:00:00.000Z",
              },
            ],
            experts: [{ personId: "person.jane", score: 9 }],
          },
        ],
      })
    );

    expect(text).toContain("## core");
    expect(text).toContain("Hotspot: score 0.9 (high)");
    expect(text).toContain("Bus factor: 1 (high) — owners: person.jane");
    expect(text).toContain("Core owns cognition");
    expect(text).toContain("Experts: jane");
  });

  it("shows 'no data' for modules missing hotspot or bus factor projections", () => {
    const text = formatChangeRiskReport(
      report({
        modules: [
          {
            moduleId: "module.core",
            hotspot: null,
            busFactor: null,
            relevantInvariants: [],
            experts: [],
          },
        ],
      })
    );

    expect(text).toContain("Hotspot: no data");
    expect(text).toContain("Bus factor: no data");
  });
});
