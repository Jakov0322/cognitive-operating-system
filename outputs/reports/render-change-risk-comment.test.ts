import { describe, expect, it } from "vitest";
import { CHANGE_RISK_COMMENT_MARKER, renderChangeRiskComment } from "./render-change-risk-comment";
import { ChangeRiskReport } from "../../core/inference/check-change-risk";

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

describe("renderChangeRiskComment", () => {
  it("always starts with the hidden marker so the comment can be found and updated later", () => {
    const text = renderChangeRiskComment(report({}));

    expect(text.startsWith(CHANGE_RISK_COMMENT_MARKER)).toBe(true);
  });

  it("shows the risk level in the heading", () => {
    const text = renderChangeRiskComment(report({ overallRiskLevel: "high" }));

    expect(text).toContain("HIGH risk");
  });

  it("says no tracked modules were touched when the module list is empty", () => {
    const text = renderChangeRiskComment(report({ modules: [] }));

    expect(text).toContain("No tracked modules were touched");
  });

  it("renders one table row per touched module with hotspot, bus factor, and experts", () => {
    const text = renderChangeRiskComment(
      report({
        modules: [
          {
            moduleId: "module.core",
            hotspot: { moduleId: "module.core", hotspotScore: 0.9, riskLevel: "high", reasons: [] },
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
            relevantInvariants: [],
            experts: [{ personId: "person.jane", score: 9 }],
          },
        ],
      })
    );

    expect(text).toContain("| core | high (0.9) | high (1) | jane |");
  });

  it("wraps touched invariants in a collapsible details block", () => {
    const text = renderChangeRiskComment(
      report({
        modules: [
          {
            moduleId: "module.core",
            hotspot: null,
            busFactor: null,
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
            experts: [],
          },
        ],
      })
    );

    expect(text).toContain("<details><summary>Architectural invariants touched</summary>");
    expect(text).toContain("Core owns cognition");
  });

  it("omits the invariants section entirely when no invariants apply", () => {
    const text = renderChangeRiskComment(
      report({
        modules: [
          { moduleId: "module.core", hotspot: null, busFactor: null, relevantInvariants: [], experts: [] },
        ],
      })
    );

    expect(text).not.toContain("<details>");
  });
});
