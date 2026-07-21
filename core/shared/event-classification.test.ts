import { describe, expect, it } from "vitest";
import { classifyEvent } from "./event-classification";
import { makeEvent } from "./testing/normalized-event-fixture";

describe("classifyEvent", () => {
  it("classifies commits with scaffold keywords in the title as scaffold", () => {
    const event = makeEvent({ title: "Initial commit", relatedFiles: ["src/index.ts"] });

    expect(classifyEvent(event)).toBe("scaffold");
  });

  it("classifies commits where most files are .gitkeep as scaffold", () => {
    const event = makeEvent({
      relatedFiles: ["src/a/.gitkeep", "src/b/.gitkeep", "src/c.ts"],
    });

    expect(classifyEvent(event)).toBe("scaffold");
  });

  it("classifies commits with only generated/vendor files as maintenance", () => {
    const event = makeEvent({ relatedFiles: ["dist/bundle.js", "node_modules/x/index.js"] });

    expect(classifyEvent(event)).toBe("maintenance");
  });

  it("classifies commits with no related files as maintenance", () => {
    const event = makeEvent({ relatedFiles: [] });

    expect(classifyEvent(event)).toBe("maintenance");
  });

  it("classifies ordinary code changes as evolution", () => {
    const event = makeEvent({
      title: "Add hotspot scoring",
      relatedFiles: ["core/inference/infer-hotspots.ts"],
    });

    expect(classifyEvent(event)).toBe("evolution");
  });
});
