import { describe, expect, it } from "vitest";
import {
  inferDriftSignals,
  ModuleActivity,
  severity,
  SnapshotDiff,
} from "./infer-architectural-drift";

function module(overrides: Partial<ModuleActivity>): ModuleActivity {
  return {
    moduleId: "module.test",
    relatedModules: [],
    authors: [],
    changeCount: 0,
    evidenceIds: [],
    ...overrides,
  };
}

const noDiff: SnapshotDiff = {
  changes: { hotspotCountDelta: 0, moduleCountDelta: 0 },
  signals: [],
};

describe("severity", () => {
  it("maps scores to low, medium, high buckets", () => {
    expect(severity(0)).toBe("low");
    expect(severity(0.49)).toBe("low");
    expect(severity(0.5)).toBe("medium");
    expect(severity(0.79)).toBe("medium");
    expect(severity(0.8)).toBe("high");
    expect(severity(1)).toBe("high");
  });
});

describe("inferDriftSignals", () => {
  it("emits no signals when nothing changed and no module is coupled", () => {
    expect(inferDriftSignals(noDiff, [])).toEqual([]);
  });

  it("emits a hotspot_growth signal when hotspot count increases", () => {
    const diff: SnapshotDiff = {
      changes: { hotspotCountDelta: 2, moduleCountDelta: 0 },
      signals: [],
    };

    const drifts = inferDriftSignals(diff, []);

    expect(drifts).toHaveLength(1);
    expect(drifts[0].type).toBe("hotspot_growth");
  });

  it("emits an architecture_expansion signal when module count increases", () => {
    const diff: SnapshotDiff = {
      changes: { hotspotCountDelta: 0, moduleCountDelta: 1 },
      signals: [],
    };

    const drifts = inferDriftSignals(diff, []);

    expect(drifts).toHaveLength(1);
    expect(drifts[0].type).toBe("architecture_expansion");
  });

  it("emits coupling_growth only when a module is both coupled and actively changing", () => {
    const coupledButQuiet = module({
      moduleId: "quiet",
      relatedModules: ["a", "b", "c"],
      changeCount: 1,
    });
    const coupledAndActive = module({
      moduleId: "active",
      relatedModules: ["a", "b", "c"],
      changeCount: 10,
    });

    const drifts = inferDriftSignals(noDiff, [coupledButQuiet, coupledAndActive]);

    expect(drifts).toHaveLength(1);
    expect(drifts[0].type).toBe("coupling_growth");
    expect(drifts[0].affectedModules).toEqual(["active"]);
  });

  it("emits ownership_fragmentation when a coupled module has 3+ authors", () => {
    const fragmented = module({
      moduleId: "fragmented",
      relatedModules: ["a", "b", "c"],
      authors: ["alice", "bob", "carol"],
    });

    const drifts = inferDriftSignals(noDiff, [fragmented]);

    expect(drifts.some((d) => d.type === "ownership_fragmentation")).toBe(true);
  });

  it("can emit both coupling_growth and ownership_fragmentation for the same module", () => {
    const both = module({
      moduleId: "risky",
      relatedModules: ["a", "b", "c"],
      authors: ["alice", "bob", "carol"],
      changeCount: 15,
    });

    const drifts = inferDriftSignals(noDiff, [both]);

    expect(drifts.map((d) => d.type).sort()).toEqual([
      "coupling_growth",
      "ownership_fragmentation",
    ]);
  });
});
