import { describe, expect, it } from "vitest";
import { extractCIJobs } from "./extract-ci-jobs";
import { makeEvent } from "../shared/testing/normalized-event-fixture";

describe("extractCIJobs", () => {
  it("ignores events from sources other than ci", () => {
    const event = makeEvent({ type: "ci.started", source: "local_git", payload: { id: 1 } });

    expect(extractCIJobs([event])).toEqual([]);
  });

  it("skips events missing a numeric id", () => {
    const event = makeEvent({ type: "ci.started", source: "ci", payload: {} });

    expect(extractCIJobs([event])).toEqual([]);
  });

  it("tracks a run's status transition from started to passed", () => {
    const events = [
      makeEvent({ id: "e1", type: "ci.started", source: "ci", payload: { id: 5, status: "in_progress" } }),
      makeEvent({
        id: "e2",
        type: "ci.passed",
        source: "ci",
        payload: { id: 5, status: "completed", conclusion: "success" },
      }),
    ];

    const [job] = extractCIJobs(events);

    expect(job.id).toBe("ci_job.5");
    expect(job.metadata?.status).toBe("completed");
    expect(job.metadata?.conclusion).toBe("success");
  });
});
