import { describe, expect, it } from "vitest";
import { buildSnapshotDiff, inferSignals, RepositorySnapshot } from "./compare-snapshots";

function snapshot(overrides: Partial<RepositorySnapshot["summary"]> = {}, id = "snap"): RepositorySnapshot {
  return {
    id,
    summary: {
      modules: 5,
      hotspots: 2,
      invariants: 4,
      events: 20,
      ...overrides,
    },
  };
}

describe("inferSignals", () => {
  it("emits no signals when nothing changed", () => {
    expect(inferSignals(snapshot(), snapshot())).toEqual([]);
  });

  it("emits hotspot_growth when hotspot count rises", () => {
    const signals = inferSignals(snapshot({ hotspots: 2 }), snapshot({ hotspots: 5 }));

    expect(signals).toContain("hotspot_growth");
  });

  it("emits architecture_expansion when module count rises", () => {
    const signals = inferSignals(snapshot({ modules: 5 }), snapshot({ modules: 7 }));

    expect(signals).toContain("architecture_expansion");
  });

  it("emits activity_growth when event count rises", () => {
    const signals = inferSignals(snapshot({ events: 20 }), snapshot({ events: 40 }));

    expect(signals).toContain("activity_growth");
  });

  it("emits architecture_maturation when invariant count rises", () => {
    const signals = inferSignals(snapshot({ invariants: 4 }), snapshot({ invariants: 6 }));

    expect(signals).toContain("architecture_maturation");
  });

  it("does not emit a signal when a metric decreases or stays flat", () => {
    const signals = inferSignals(snapshot({ hotspots: 5 }), snapshot({ hotspots: 3 }));

    expect(signals).not.toContain("hotspot_growth");
  });
});

describe("buildSnapshotDiff", () => {
  it("computes deltas as current minus previous", () => {
    const diff = buildSnapshotDiff(
      snapshot({ modules: 5, hotspots: 2, invariants: 4, events: 20 }, "prev"),
      snapshot({ modules: 8, hotspots: 1, invariants: 4, events: 25 }, "curr"),
      "2026-01-01T00:00:00.000Z"
    );

    expect(diff.changes).toEqual({
      moduleCountDelta: 3,
      hotspotCountDelta: -1,
      invariantCountDelta: 0,
      eventCountDelta: 5,
    });
  });

  it("references the previous and current snapshot ids", () => {
    const diff = buildSnapshotDiff(snapshot({}, "prev"), snapshot({}, "curr"), "2026-01-01T00:00:00.000Z");

    expect(diff.snapshots).toEqual({ previous: "prev", current: "curr" });
  });

  it("includes the signals inferred from the same snapshot pair", () => {
    const diff = buildSnapshotDiff(
      snapshot({ modules: 5 }, "prev"),
      snapshot({ modules: 9 }, "curr"),
      "2026-01-01T00:00:00.000Z"
    );

    expect(diff.signals).toContain("architecture_expansion");
  });
});
