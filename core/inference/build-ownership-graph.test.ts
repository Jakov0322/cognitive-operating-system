import { describe, expect, it } from "vitest";
import { buildOwnershipGraph, ExpertiseProfile, label } from "./build-ownership-graph";

function profile(overrides: Partial<ExpertiseProfile>): ExpertiseProfile {
  return {
    personId: "person.jane",
    strongestModules: [],
    ownershipConfidence: { score: 0.8, level: "high" },
    evidenceIds: [],
    ...overrides,
  };
}

describe("label", () => {
  it("strips the person./module. prefix", () => {
    expect(label("person.jane")).toBe("jane");
    expect(label("module.core")).toBe("core");
  });
});

describe("buildOwnershipGraph", () => {
  it("returns an empty graph for no profiles", () => {
    const graph = buildOwnershipGraph([], "2026-01-01T00:00:00.000Z");

    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
  });

  it("creates a person node and a module node per strongest module", () => {
    const graph = buildOwnershipGraph(
      [profile({ strongestModules: [{ moduleId: "module.core", score: 5 }] })],
      "2026-01-01T00:00:00.000Z"
    );

    expect(graph.nodes.map((n) => n.id).sort()).toEqual(["module.core", "person.jane"]);
  });

  it("classifies an edge as owns when the score is 8 or higher, otherwise contributes_to", () => {
    const graph = buildOwnershipGraph([
      profile({
        personId: "person.jane",
        strongestModules: [
          { moduleId: "module.core", score: 8 },
          { moduleId: "module.outputs", score: 3 },
        ],
      }),
    ]);

    const coreEdge = graph.edges.find((e) => e.to === "module.core");
    const outputsEdge = graph.edges.find((e) => e.to === "module.outputs");

    expect(coreEdge?.type).toBe("owns");
    expect(outputsEdge?.type).toBe("contributes_to");
  });

  it("sorts edges by descending weight", () => {
    const graph = buildOwnershipGraph([
      profile({
        strongestModules: [
          { moduleId: "module.quiet", score: 1 },
          { moduleId: "module.busy", score: 9 },
        ],
      }),
    ]);

    expect(graph.edges.map((e) => e.to)).toEqual(["module.busy", "module.quiet"]);
  });

  it("stamps the graph with the provided generation timestamp", () => {
    const graph = buildOwnershipGraph([], "2026-05-05T00:00:00.000Z");

    expect(graph.generatedAt).toBe("2026-05-05T00:00:00.000Z");
  });
});
