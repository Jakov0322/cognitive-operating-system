import { describe, expect, it } from "vitest";
import { inferHotspots, ModuleActivityProjection } from "./infer-hotspots";

function module(overrides: Partial<ModuleActivityProjection>): ModuleActivityProjection {
  return {
    moduleId: "module.test",
    changeCount: 0,
    authors: [],
    relatedModules: [],
    evidenceIds: [],
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("inferHotspots", () => {
  it("returns an empty array for no modules", () => {
    expect(inferHotspots([])).toEqual([]);
  });

  it("scores the module with the most changes and coupling highest", () => {
    const modules = [
      module({ moduleId: "core", changeCount: 100, relatedModules: ["a", "b", "c"] }),
      module({ moduleId: "bin", changeCount: 2, relatedModules: [] }),
    ];

    const [top, bottom] = inferHotspots(modules);

    expect(top.moduleId).toBe("core");
    expect(bottom.moduleId).toBe("bin");
    expect(top.hotspotScore).toBeGreaterThan(bottom.hotspotScore);
  });

  it("flags high_change_frequency only when change score crosses the 0.75 threshold", () => {
    const modules = [
      module({ moduleId: "hot", changeCount: 100 }),
      module({ moduleId: "cold", changeCount: 10 }),
    ];

    const [hot, cold] = inferHotspots(modules);

    expect(hot.reasons).toContain("high_change_frequency");
    expect(cold.reasons).not.toContain("high_change_frequency");
  });

  it("flags multiple_authors when a module has more than one author", () => {
    const [result] = inferHotspots([
      module({ moduleId: "shared", authors: ["alice", "bob"] }),
    ]);

    expect(result.reasons).toContain("multiple_authors");
  });

  it("does not divide by zero when every module has zero changes, authors, or coupling", () => {
    const [result] = inferHotspots([module({})]);

    expect(result.hotspotScore).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  it("caps hotspot scores at 1", () => {
    const [result] = inferHotspots([
      module({ moduleId: "only", changeCount: 5, authors: ["a"], relatedModules: ["b"] }),
    ]);

    expect(result.hotspotScore).toBeLessThanOrEqual(1);
  });
});
