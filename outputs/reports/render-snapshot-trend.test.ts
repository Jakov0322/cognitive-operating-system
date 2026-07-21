import { describe, expect, it } from "vitest";
import { renderMarkdown } from "./render-snapshot-trend";

describe("renderMarkdown (snapshot trend)", () => {
  it("reports zero tracked snapshots for an empty trend", () => {
    const text = renderMarkdown({ generatedAt: "2026-01-01T00:00:00.000Z", points: [] });

    expect(text).toContain("Snapshots tracked: 0");
  });

  it("renders one table row per point with its summary counts", () => {
    const text = renderMarkdown({
      generatedAt: "2026-01-01T00:00:00.000Z",
      points: [
        {
          snapshotId: "s1",
          createdAt: "2026-01-01T00:00:00.000Z",
          summary: { modules: 5, hotspots: 2, invariants: 3, events: 10 },
          signals: [],
        },
      ],
    });

    expect(text).toContain("| 2026-01-01T00:00:00.000Z | 5 | 2 | 3 | 10 | - |");
  });

  it("translates signal codes into human-readable labels", () => {
    const text = renderMarkdown({
      generatedAt: "2026-01-01T00:00:00.000Z",
      points: [
        {
          snapshotId: "s1",
          createdAt: "2026-01-01T00:00:00.000Z",
          summary: { modules: 5, hotspots: 2, invariants: 3, events: 10 },
          signals: ["hotspot_growth", "architecture_expansion"],
        },
      ],
    });

    expect(text).toContain("Hotspot growth, Architecture expansion");
  });
});
