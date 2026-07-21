import { describe, expect, it } from "vitest";
import { parseGitScanArgs } from "./run-analysis";

describe("parseGitScanArgs", () => {
  it("returns nothing when no relevant flags are passed", () => {
    expect(parseGitScanArgs([])).toEqual([]);
  });

  it("forwards --since together with its ref value", () => {
    expect(parseGitScanArgs(["--since", "abc123"])).toEqual(["--since", "abc123"]);
  });

  it("forwards --full", () => {
    expect(parseGitScanArgs(["--full"])).toEqual(["--full"]);
  });

  it("ignores unrelated flags analyze doesn't understand", () => {
    expect(parseGitScanArgs(["--verbose", "--since", "abc123"])).toEqual([
      "--since",
      "abc123",
    ]);
  });
});
