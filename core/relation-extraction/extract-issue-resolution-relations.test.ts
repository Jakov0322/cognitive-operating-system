import { describe, expect, it } from "vitest";
import { extractIssueResolutionRelations } from "./extract-issue-resolution-relations";
import { makeEvent } from "../shared/testing/normalized-event-fixture";

describe("extractIssueResolutionRelations", () => {
  it("ignores non-github pull request events", () => {
    const event = makeEvent({
      type: "pull_request.opened",
      source: "local_git",
      payload: { number: 1 },
      summary: "fixes #2",
    });

    expect(extractIssueResolutionRelations([event])).toEqual([]);
  });

  it("ignores PR text with no resolution keyword", () => {
    const event = makeEvent({
      type: "pull_request.opened",
      source: "github",
      payload: { number: 1 },
      summary: "Related to #2 but does not resolve it",
    });

    expect(extractIssueResolutionRelations([event])).toEqual([]);
  });

  it("links a PR to every issue it closes, fixes, or resolves", () => {
    const event = makeEvent({
      type: "pull_request.opened",
      source: "github",
      payload: { number: 10 },
      summary: "Closes #2 and fixes #3, resolves #4",
    });

    const relations = extractIssueResolutionRelations([event]);

    expect(relations.map((r) => r.toEntityId).sort()).toEqual([
      "issue.2",
      "issue.3",
      "issue.4",
    ]);
    expect(relations.every((r) => r.fromEntityId === "pull_request.10")).toBe(true);
  });

  it("deduplicates the same issue number mentioned twice", () => {
    const event = makeEvent({
      type: "pull_request.opened",
      source: "github",
      payload: { number: 10 },
      title: "Fixes #2",
      summary: "This closes #2 as well",
    });

    const relations = extractIssueResolutionRelations([event]);

    expect(relations).toHaveLength(1);
  });
});
