import { describe, expect, it } from "vitest";
import { mergeEntities } from "./run-entity-extraction";
import { Entity } from "../../knowledge/schemas/entity";
import { EntityType } from "../../knowledge/ontology/entities";

function entity(overrides: Partial<Entity>): Entity {
  return {
    id: "module.core",
    type: EntityType.Module,
    name: "core",
    confidence: 0.75,
    evidenceIds: [],
    tags: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("mergeEntities", () => {
  it("returns entities untouched when ids don't collide", () => {
    const merged = mergeEntities([
      entity({ id: "module.core" }),
      entity({ id: "module.outputs" }),
    ]);

    expect(merged).toHaveLength(2);
  });

  it("unions evidence ids and tags for entities sharing an id", () => {
    const merged = mergeEntities([
      entity({ id: "module.core", evidenceIds: ["e1"], tags: ["module"] }),
      entity({ id: "module.core", evidenceIds: ["e2"], tags: ["inferred-from-path"] }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].evidenceIds.sort()).toEqual(["e1", "e2"]);
    expect(merged[0].tags?.sort()).toEqual(["inferred-from-path", "module"]);
  });

  it("keeps the first entity's own fields when merging (only evidence/tags/updatedAt union)", () => {
    const merged = mergeEntities([
      entity({ id: "module.core", name: "core-first" }),
      entity({ id: "module.core", name: "core-second" }),
    ]);

    expect(merged[0].name).toBe("core-first");
  });
});
