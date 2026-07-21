import { describe, expect, it } from "vitest";
import { extractAuthorshipRelations } from "./extract-authorship-relations";
import { makeEvent } from "../shared/testing/normalized-event-fixture";

describe("extractAuthorshipRelations", () => {
  it("skips events with no actor", () => {
    expect(
      extractAuthorshipRelations([makeEvent({ actor: undefined, relatedFiles: ["core/a.ts"] })])
    ).toEqual([]);
  });

  it("links the author to every non-ignored module they touched", () => {
    const relations = extractAuthorshipRelations([
      makeEvent({ actor: "Jane", relatedFiles: ["core/a.ts", "outputs/b.ts", "package.json"] }),
    ]);

    expect(relations.map((r) => r.toEntityId).sort()).toEqual([
      "module.core",
      "module.outputs",
    ]);
    expect(relations.every((r) => r.fromEntityId === "person.jane")).toBe(true);
  });

  it("weights scaffold commits lower than ordinary evolution commits", () => {
    const [scaffold] = extractAuthorshipRelations([
      makeEvent({ actor: "Jane", title: "Initial commit", relatedFiles: ["core/a.ts"] }),
    ]);
    const [evolution] = extractAuthorshipRelations([
      makeEvent({ actor: "Jane", title: "Add feature", relatedFiles: ["core/a.ts"] }),
    ]);

    expect(scaffold.metadata?.changeCount).toBeLessThan(evolution.metadata?.changeCount as number);
  });

  it("accumulates changeCount across multiple events touching the same module", () => {
    const events = [
      makeEvent({ id: "e1", actor: "Jane", title: "Add feature", relatedFiles: ["core/a.ts"] }),
      makeEvent({ id: "e2", actor: "Jane", title: "Add more", relatedFiles: ["core/b.ts"] }),
    ];

    const [relation] = extractAuthorshipRelations(events);

    expect(relation.metadata?.changeCount).toBe(2);
  });
});
