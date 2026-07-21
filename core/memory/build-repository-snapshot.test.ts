import { describe, expect, it } from "vitest";
import { buildRepositorySnapshot } from "./build-repository-snapshot";

const references = {
  moduleActivity: "module-activity.json",
  hotspots: "hotspots.json",
  invariants: "invariants.json",
  timeline: "timeline.json",
};

describe("buildRepositorySnapshot", () => {
  it("counts modules, hotspots, and invariants by array length", () => {
    const snapshot = buildRepositorySnapshot(
      {
        repositoryName: "cognitive-os",
        modules: [{}, {}],
        hotspots: [{}],
        invariants: [{}, {}, {}],
        timeline: [],
        references,
      },
      "2026-01-01T00:00:00.000Z"
    );

    expect(snapshot.summary).toEqual({
      modules: 2,
      hotspots: 1,
      invariants: 3,
      events: 0,
    });
  });

  it("sums eventCount across all timeline days", () => {
    const snapshot = buildRepositorySnapshot(
      {
        repositoryName: "cognitive-os",
        modules: [],
        hotspots: [],
        invariants: [],
        timeline: [{ eventCount: 3 }, { eventCount: 5 }, {}],
        references,
      },
      "2026-01-01T00:00:00.000Z"
    );

    expect(snapshot.summary.events).toBe(8);
  });

  it("carries the repository name and references through unchanged", () => {
    const snapshot = buildRepositorySnapshot(
      {
        repositoryName: "cognitive-os",
        modules: [],
        hotspots: [],
        invariants: [],
        timeline: [],
        references,
      },
      "2026-01-01T00:00:00.000Z"
    );

    expect(snapshot.metadata.repositoryName).toBe("cognitive-os");
    expect(snapshot.references).toEqual(references);
    expect(snapshot.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });
});
