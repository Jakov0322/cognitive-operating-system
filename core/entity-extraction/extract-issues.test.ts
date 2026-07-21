import { describe, expect, it } from "vitest";
import { extractIssues } from "./extract-issues";
import { makeEvent } from "../shared/testing/normalized-event-fixture";

describe("extractIssues", () => {
  it("ignores non-issue event types", () => {
    expect(extractIssues([makeEvent({ type: "commit.created", source: "github" })])).toEqual([]);
  });

  it("builds a github issue id from its number", () => {
    const [issue] = extractIssues([
      makeEvent({ type: "issue.created", source: "github", payload: { number: 42 } }),
    ]);

    expect(issue.id).toBe("issue.42");
  });

  it("builds a linear issue id from its identifier", () => {
    const [issue] = extractIssues([
      makeEvent({ type: "issue.created", source: "linear", payload: { identifier: "ENG-12" } }),
    ]);

    expect(issue.id).toBe("issue.linear.ENG-12");
  });

  it("builds a jira issue id from its key", () => {
    const [issue] = extractIssues([
      makeEvent({ type: "issue.created", source: "jira", payload: { key: "PROJ-7" } }),
    ]);

    expect(issue.id).toBe("issue.jira.PROJ-7");
  });

  it("updates state on the existing issue when it is closed", () => {
    const events = [
      makeEvent({
        id: "e1",
        type: "issue.created",
        source: "github",
        payload: { number: 42, state: "open" },
      }),
      makeEvent({
        id: "e2",
        type: "issue.closed",
        source: "github",
        payload: { number: 42, state: "closed" },
      }),
    ];

    const [issue] = extractIssues(events);

    expect(issue.metadata?.state).toBe("closed");
  });

  it("skips github issue events missing a valid number", () => {
    expect(
      extractIssues([
        makeEvent({ type: "issue.created", source: "github", payload: {} }),
      ])
    ).toEqual([]);
  });
});
