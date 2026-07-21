import { describe, expect, it } from "vitest";
import { extractPullRequests } from "./extract-pull-requests";
import { makeEvent } from "../shared/testing/normalized-event-fixture";

describe("extractPullRequests", () => {
  it("ignores pull request events from sources other than github", () => {
    const event = makeEvent({
      type: "pull_request.opened",
      source: "local_git",
      payload: { number: 1 },
    });

    expect(extractPullRequests([event])).toEqual([]);
  });

  it("ignores non pull-request event types", () => {
    const event = makeEvent({ type: "commit.created", source: "github", payload: { number: 1 } });

    expect(extractPullRequests([event])).toEqual([]);
  });

  it("creates one entity keyed by PR number", () => {
    const [pr] = extractPullRequests([
      makeEvent({ type: "pull_request.opened", source: "github", payload: { number: 7 } }),
    ]);

    expect(pr.id).toBe("pull_request.7");
  });

  it("updates merged state as the PR moves through its lifecycle", () => {
    const events = [
      makeEvent({
        id: "e1",
        type: "pull_request.opened",
        source: "github",
        payload: { number: 7, state: "open", merged: false },
      }),
      makeEvent({
        id: "e2",
        type: "pull_request.merged",
        source: "github",
        payload: { number: 7, state: "closed", merged: true },
      }),
    ];

    const [pr] = extractPullRequests(events);

    expect(pr.metadata?.state).toBe("closed");
    expect(pr.metadata?.merged).toBe(true);
  });
});
