import { NormalizedEvent } from "../../../knowledge/schemas/normalized-event";

export function makeEvent(overrides: Partial<NormalizedEvent> = {}): NormalizedEvent {
  return {
    id: "event.1",
    type: "commit.created",
    source: "local_git",
    timestamp: "2026-01-01T00:00:00.000Z",
    payload: {},
    evidenceIds: ["evidence.1"],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
