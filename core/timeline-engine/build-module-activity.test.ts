import { describe, expect, it } from "vitest";
import { buildModuleActivity } from "./build-module-activity";
import { Relation } from "../../knowledge/schemas/relation";
import { RelationType } from "../../knowledge/ontology/relations";

function relation(overrides: Partial<Relation>): Relation {
  return {
    id: "r1",
    type: RelationType.Modifies,
    fromEntityId: "person.jane",
    toEntityId: "module.core",
    confidence: 0.75,
    evidenceIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildModuleActivity", () => {
  it("returns nothing for an empty relation set", () => {
    expect(buildModuleActivity([])).toEqual([]);
  });

  it("accumulates changeCount from modifies relations using metadata.changeCount", () => {
    const relations = [
      relation({ id: "r1", metadata: { changeCount: 3 } }),
      relation({ id: "r2", metadata: { changeCount: 2 } }),
    ];

    const [module] = buildModuleActivity(relations);

    expect(module.moduleId).toBe("module.core");
    expect(module.changeCount).toBe(5);
  });

  it("defaults to a weight of 1 when metadata.changeCount is missing", () => {
    const [module] = buildModuleActivity([relation({})]);

    expect(module.changeCount).toBe(1);
  });

  it("collects distinct authors for a module across relations", () => {
    const relations = [
      relation({ id: "r1", fromEntityId: "person.jane" }),
      relation({ id: "r2", fromEntityId: "person.bob" }),
      relation({ id: "r3", fromEntityId: "person.jane" }),
    ];

    const [module] = buildModuleActivity(relations);

    expect(module.authors.sort()).toEqual(["person.bob", "person.jane"]);
  });

  it("links both sides of a related_to relation as coupled modules", () => {
    const relations = [
      relation({
        id: "r1",
        type: RelationType.RelatedTo,
        fromEntityId: "module.core",
        toEntityId: "module.outputs",
      }),
    ];

    const modules = buildModuleActivity(relations);
    const core = modules.find((m) => m.moduleId === "module.core");
    const outputs = modules.find((m) => m.moduleId === "module.outputs");

    expect(core?.relatedModules).toEqual(["module.outputs"]);
    expect(outputs?.relatedModules).toEqual(["module.core"]);
  });

  it("sorts modules by descending changeCount", () => {
    const relations = [
      relation({ id: "r1", toEntityId: "module.quiet", metadata: { changeCount: 1 } }),
      relation({ id: "r2", toEntityId: "module.busy", metadata: { changeCount: 10 } }),
    ];

    const modules = buildModuleActivity(relations);

    expect(modules.map((m) => m.moduleId)).toEqual(["module.busy", "module.quiet"]);
  });
});
