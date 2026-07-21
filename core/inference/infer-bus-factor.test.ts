import { describe, expect, it } from "vitest";
import { computeBusFactorRisks, OwnershipGraph, riskLevel } from "./infer-bus-factor";

describe("riskLevel", () => {
  it("treats a single owner as high risk", () => {
    expect(riskLevel(1)).toBe("high");
    expect(riskLevel(0)).toBe("high");
  });

  it("treats two owners as medium risk", () => {
    expect(riskLevel(2)).toBe("medium");
  });

  it("treats three or more owners as low risk", () => {
    expect(riskLevel(3)).toBe("low");
    expect(riskLevel(5)).toBe("low");
  });
});

describe("computeBusFactorRisks", () => {
  it("returns no risks for an empty graph", () => {
    expect(computeBusFactorRisks({ edges: [] })).toEqual([]);
  });

  it("deduplicates a person who both owns and contributes to the same module", () => {
    const graph: OwnershipGraph = {
      edges: [
        { from: "alice", to: "core", type: "owns", weight: 5, confidence: { score: 0.9, level: "high" }, evidenceIds: ["e1"] },
        { from: "alice", to: "core", type: "contributes_to", weight: 1, confidence: { score: 0.5, level: "medium" }, evidenceIds: ["e2"] },
      ],
    };

    const [risk] = computeBusFactorRisks(graph);

    expect(risk.busFactor).toBe(1);
    expect(risk.riskLevel).toBe("high");
    expect(risk.primaryOwners).toEqual(["alice"]);
  });

  it("counts distinct owners and contributors toward the bus factor", () => {
    const graph: OwnershipGraph = {
      edges: [
        { from: "alice", to: "core", type: "owns", weight: 5, confidence: { score: 0.9, level: "high" }, evidenceIds: [] },
        { from: "bob", to: "core", type: "contributes_to", weight: 2, confidence: { score: 0.6, level: "medium" }, evidenceIds: [] },
      ],
    };

    const [risk] = computeBusFactorRisks(graph);

    expect(risk.busFactor).toBe(2);
    expect(risk.riskLevel).toBe("medium");
  });

  it("merges evidence ids across edges for the same module without duplicates", () => {
    const graph: OwnershipGraph = {
      edges: [
        { from: "alice", to: "core", type: "owns", weight: 1, confidence: { score: 0.5, level: "medium" }, evidenceIds: ["e1", "e2"] },
        { from: "bob", to: "core", type: "contributes_to", weight: 1, confidence: { score: 0.5, level: "medium" }, evidenceIds: ["e2", "e3"] },
      ],
    };

    const [risk] = computeBusFactorRisks(graph);

    expect(new Set(risk.evidenceIds)).toEqual(new Set(["e1", "e2", "e3"]));
  });

  it("keeps modules independent of each other", () => {
    const graph: OwnershipGraph = {
      edges: [
        { from: "alice", to: "core", type: "owns", weight: 1, confidence: { score: 0.5, level: "medium" }, evidenceIds: [] },
        { from: "bob", to: "outputs", type: "owns", weight: 1, confidence: { score: 0.5, level: "medium" }, evidenceIds: [] },
      ],
    };

    const risks = computeBusFactorRisks(graph);

    expect(risks.map((r) => r.moduleId).sort()).toEqual(["core", "outputs"]);
    expect(risks.every((r) => r.busFactor === 1)).toBe(true);
  });
});
