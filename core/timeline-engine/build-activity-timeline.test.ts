import { describe, expect, it } from "vitest";
import { buildActivityTimeline } from "./build-activity-timeline";
import { makeEvent } from "../shared/testing/normalized-event-fixture";

describe("buildActivityTimeline", () => {
  it("returns nothing for no events", () => {
    expect(buildActivityTimeline([])).toEqual([]);
  });

  it("groups events by the date portion of their timestamp", () => {
    const events = [
      makeEvent({ id: "e1", timestamp: "2026-01-01T09:00:00.000Z" }),
      makeEvent({ id: "e2", timestamp: "2026-01-01T18:00:00.000Z" }),
      makeEvent({ id: "e3", timestamp: "2026-01-02T09:00:00.000Z" }),
    ];

    const timeline = buildActivityTimeline(events);

    expect(timeline.map((d) => d.date)).toEqual(["2026-01-01", "2026-01-02"]);
    expect(timeline[0].eventCount).toBe(2);
  });

  it("sorts days chronologically regardless of input order", () => {
    const events = [
      makeEvent({ id: "e1", timestamp: "2026-03-01T00:00:00.000Z" }),
      makeEvent({ id: "e2", timestamp: "2026-01-01T00:00:00.000Z" }),
    ];

    const timeline = buildActivityTimeline(events);

    expect(timeline.map((d) => d.date)).toEqual(["2026-01-01", "2026-03-01"]);
  });

  it("weights scaffold commits lower than evolution commits in changeCount", () => {
    const scaffoldDay = buildActivityTimeline([
      makeEvent({ title: "Initial commit", timestamp: "2026-01-01T00:00:00.000Z" }),
    ]);
    const evolutionDay = buildActivityTimeline([
      makeEvent({ title: "Add feature", relatedFiles: ["core/a.ts"], timestamp: "2026-01-01T00:00:00.000Z" }),
    ]);

    expect(scaffoldDay[0].changeCount).toBeLessThan(evolutionDay[0].changeCount);
  });

  it("tallies classification counts per day", () => {
    const events = [
      makeEvent({ id: "e1", title: "Initial commit", timestamp: "2026-01-01T00:00:00.000Z" }),
      makeEvent({ id: "e2", title: "Add feature", relatedFiles: ["core/a.ts"], timestamp: "2026-01-01T00:00:00.000Z" }),
    ];

    const [day] = buildActivityTimeline(events);

    expect(day.classifications.scaffold).toBe(1);
    expect(day.classifications.evolution).toBe(1);
  });

  it("collects distinct module ids touched on a day, ignoring config/vendor files", () => {
    const events = [
      makeEvent({ relatedFiles: ["core/a.ts", "outputs/b.ts", "package.json"] }),
    ];

    const [day] = buildActivityTimeline(events);

    expect(day.modules.sort()).toEqual(["module.core", "module.outputs"]);
  });
});
