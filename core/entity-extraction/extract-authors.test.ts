import { describe, expect, it } from "vitest";
import { extractAuthors } from "./extract-authors";
import { makeEvent } from "../shared/testing/normalized-event-fixture";

describe("extractAuthors", () => {
  it("skips events with no actor", () => {
    expect(extractAuthors([makeEvent({ actor: undefined })])).toEqual([]);
  });

  it("prefers author email over name for identity when both are present", () => {
    const [person] = extractAuthors([
      makeEvent({ actor: "Jane Doe", payload: { authorEmail: "jane@example.com" } }),
    ]);

    expect(person.id).toBe("person.jane-example-com");
  });

  it("merges two events from the same actor into a single entity", () => {
    const events = [
      makeEvent({ id: "e1", actor: "Jane Doe", evidenceIds: ["ev1"], timestamp: "2026-01-01T00:00:00.000Z" }),
      makeEvent({ id: "e2", actor: "Jane Doe", evidenceIds: ["ev2"], timestamp: "2026-01-02T00:00:00.000Z" }),
    ];

    const entities = extractAuthors(events);

    expect(entities).toHaveLength(1);
    expect(entities[0].evidenceIds.sort()).toEqual(["ev1", "ev2"]);
  });

  it("keeps the latest timestamp as lastSeenAt regardless of event order", () => {
    const events = [
      makeEvent({ id: "e1", actor: "Jane Doe", timestamp: "2026-03-01T00:00:00.000Z" }),
      makeEvent({ id: "e2", actor: "Jane Doe", timestamp: "2026-01-01T00:00:00.000Z" }),
    ];

    const [person] = extractAuthors(events);

    expect(person.lastSeenAt).toBe("2026-03-01T00:00:00.000Z");
  });

  it("treats different actors as distinct people", () => {
    const entities = extractAuthors([
      makeEvent({ actor: "Jane Doe" }),
      makeEvent({ actor: "Bob Smith" }),
    ]);

    expect(entities).toHaveLength(2);
  });
});
