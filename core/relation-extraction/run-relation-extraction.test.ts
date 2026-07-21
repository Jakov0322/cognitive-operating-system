import { describe, expect, it } from "vitest";
import { mergeRelations } from "./run-relation-extraction";
import { Relation } from "../../knowledge/schemas/relation";
import { RelationType } from "../../knowledge/ontology/relations";

function relation(overrides: Partial<Relation>): Relation {
  return {
    id: "relation.person.jane.modifies.module.core",
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

describe("mergeRelations", () => {
  it("returns relations untouched when ids don't collide", () => {
    const merged = mergeRelations([
      relation({ id: "r1" }),
      relation({ id: "r2" }),
    ]);

    expect(merged).toHaveLength(2);
  });

  it("unions evidence ids for relations sharing an id", () => {
    const merged = mergeRelations([
      relation({ id: "r1", evidenceIds: ["e1"] }),
      relation({ id: "r1", evidenceIds: ["e2"] }),
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].evidenceIds.sort()).toEqual(["e1", "e2"]);
  });

  it("keeps the first relation's own fields when merging (only evidence/updatedAt union)", () => {
    const merged = mergeRelations([
      relation({ id: "r1", confidence: 0.75 }),
      relation({ id: "r1", confidence: 0.55 }),
    ]);

    expect(merged[0].confidence).toBe(0.75);
  });
});
