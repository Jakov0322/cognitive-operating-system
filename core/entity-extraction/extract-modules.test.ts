import { describe, expect, it } from "vitest";
import { extractModules } from "./extract-modules";
import { makeEvent } from "../shared/testing/normalized-event-fixture";

describe("extractModules", () => {
  it("infers the module name from the second segment under src/apps/packages", () => {
    const [module] = extractModules([
      makeEvent({ relatedFiles: ["src/core/inference/infer-hotspots.ts"] }),
    ]);

    expect(module.id).toBe("module.core");
  });

  it("falls back to the first path segment outside src/apps/packages", () => {
    const [module] = extractModules([makeEvent({ relatedFiles: ["core/inference/x.ts"] })]);

    expect(module.id).toBe("module.core");
  });

  it("ignores root config files and .gitkeep files", () => {
    const modules = extractModules([
      makeEvent({ relatedFiles: ["package.json", ".gitignore", "src/.gitkeep"] }),
    ]);

    expect(modules).toEqual([]);
  });

  it("caps stored example files at 10 per module", () => {
    const files = Array.from({ length: 15 }, (_, i) => `core/file-${i}.ts`);
    const [module] = extractModules([makeEvent({ relatedFiles: files })]);

    expect((module.metadata?.exampleFiles as string[]).length).toBe(10);
  });

  it("merges evidence across events touching the same module", () => {
    const events = [
      makeEvent({ id: "e1", relatedFiles: ["core/a.ts"], evidenceIds: ["ev1"] }),
      makeEvent({ id: "e2", relatedFiles: ["core/b.ts"], evidenceIds: ["ev2"] }),
    ];

    const [module] = extractModules(events);

    expect(module.evidenceIds.sort()).toEqual(["ev1", "ev2"]);
  });
});
