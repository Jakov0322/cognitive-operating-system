import { describe, expect, it } from "vitest";
import { buildSnapshotTrend } from "./build-snapshot-trend";

function snapshot(
  id: string,
  createdAt: string,
  summary: { modules: number; hotspots: number; invariants: number; events: number }
) {
  return { id, createdAt, summary };
}

describe("buildSnapshotTrend", () => {
  it("returns no points for no snapshots", () => {
    expect(buildSnapshotTrend([], "2026-01-01T00:00:00.000Z")).toEqual({
      generatedAt: "2026-01-01T00:00:00.000Z",
      points: [],
    });
  });

  it("gives the first point no signals since there is nothing to compare against", () => {
    const trend = buildSnapshotTrend([
      snapshot("s1", "2026-01-01T00:00:00.000Z", { modules: 5, hotspots: 1, invariants: 3, events: 10 }),
    ]);

    expect(trend.points[0].signals).toEqual([]);
  });

  it("sorts points chronologically regardless of input order", () => {
    const trend = buildSnapshotTrend([
      snapshot("s2", "2026-03-01T00:00:00.000Z", { modules: 1, hotspots: 1, invariants: 1, events: 1 }),
      snapshot("s1", "2026-01-01T00:00:00.000Z", { modules: 1, hotspots: 1, invariants: 1, events: 1 }),
    ]);

    expect(trend.points.map((p) => p.snapshotId)).toEqual(["s1", "s2"]);
  });

  it("computes signals for each point relative to the immediately preceding one", () => {
    const trend = buildSnapshotTrend([
      snapshot("s1", "2026-01-01T00:00:00.000Z", { modules: 5, hotspots: 1, invariants: 3, events: 10 }),
      snapshot("s2", "2026-02-01T00:00:00.000Z", { modules: 5, hotspots: 3, invariants: 3, events: 20 }),
      snapshot("s3", "2026-03-01T00:00:00.000Z", { modules: 8, hotspots: 3, invariants: 3, events: 20 }),
    ]);

    expect(trend.points[1].signals).toEqual(["hotspot_growth", "activity_growth"]);
    expect(trend.points[2].signals).toEqual(["architecture_expansion"]);
  });

  it("carries each snapshot's own summary through unchanged", () => {
    const summary = { modules: 5, hotspots: 1, invariants: 3, events: 10 };
    const trend = buildSnapshotTrend([snapshot("s1", "2026-01-01T00:00:00.000Z", summary)]);

    expect(trend.points[0].summary).toEqual(summary);
  });
});
