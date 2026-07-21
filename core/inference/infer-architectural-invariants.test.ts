import { describe, expect, it } from "vitest";
import { inferArchitecturalInvariants } from "./infer-architectural-invariants";

describe("inferArchitecturalInvariants", () => {
  it("returns a stable set of five invariant ids", () => {
    const invariants = inferArchitecturalInvariants();

    expect(invariants.map((i) => i.id).sort()).toEqual([
      "invariant.connectors-do-not-own-inference",
      "invariant.core-owns-cognition",
      "invariant.knowledge-is-machine-memory",
      "invariant.no-raw-api-parsing-in-outputs",
      "invariant.outputs-are-generated-context",
    ]);
  });

  it("gives every invariant a valid confidence score", () => {
    for (const invariant of inferArchitecturalInvariants()) {
      expect(invariant.confidence.score).toBeGreaterThan(0);
      expect(invariant.confidence.score).toBeLessThanOrEqual(1);
      expect(["low", "medium", "high"]).toContain(invariant.confidence.level);
    }
  });

  it("keeps the forbidden_dependency invariants pointed away from connectors owning inference", () => {
    const invariants = inferArchitecturalInvariants();
    const rule = invariants.find(
      (i) => i.id === "invariant.connectors-do-not-own-inference"
    );

    expect(rule?.sourceModules).toEqual(["module.connectors"]);
    expect(rule?.targetModules).toEqual(["module.core", "module.outputs"]);
  });
});
