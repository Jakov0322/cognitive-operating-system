import { describe, expect, it } from "vitest";
import { extractModuleChangeRelations } from "./extract-module-change-relations";
import { makeEvent } from "../shared/testing/normalized-event-fixture";

describe("extractModuleChangeRelations", () => {
  it("does not create a relation when only one module is touched", () => {
    expect(
      extractModuleChangeRelations([makeEvent({ relatedFiles: ["core/a.ts", "core/b.ts"] })])
    ).toEqual([]);
  });

  it("links two distinct modules changed together in the same event", () => {
    const [relation] = extractModuleChangeRelations([
      makeEvent({ relatedFiles: ["core/a.ts", "outputs/b.ts"] }),
    ]);

    expect(relation.fromEntityId).toBe("module.core");
    expect(relation.toEntityId).toBe("module.outputs");
  });

  it("creates one relation per unordered pair for events touching 3+ modules", () => {
    const relations = extractModuleChangeRelations([
      makeEvent({ relatedFiles: ["core/a.ts", "outputs/b.ts", "knowledge/c.ts"] }),
    ]);

    expect(relations).toHaveLength(3);
  });

  it("accumulates coChangeCount across repeated co-changes of the same pair", () => {
    const events = [
      makeEvent({ id: "e1", relatedFiles: ["core/a.ts", "outputs/b.ts"] }),
      makeEvent({ id: "e2", relatedFiles: ["core/c.ts", "outputs/d.ts"] }),
    ];

    const [relation] = extractModuleChangeRelations(events);

    expect(relation.metadata?.coChangeCount).toBe(2);
  });
});
