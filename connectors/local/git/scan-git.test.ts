import { describe, expect, it } from "vitest";
import { parseArgs } from "./scan-git";

describe("parseArgs", () => {
  it("defaults to a full, cursor-repository scan with no flags", () => {
    expect(parseArgs([])).toEqual({ since: undefined, full: false, repositoryPath: undefined });
  });

  it("parses --since with its ref value", () => {
    expect(parseArgs(["--since", "abc123"])).toEqual({
      since: "abc123",
      full: false,
      repositoryPath: undefined,
    });
  });

  it("parses the --full flag", () => {
    expect(parseArgs(["--full"])).toEqual({ since: undefined, full: true, repositoryPath: undefined });
  });

  it("treats a non-flag argument as the repository path", () => {
    expect(parseArgs(["/path/to/repo"])).toEqual({
      since: undefined,
      full: false,
      repositoryPath: "/path/to/repo",
    });
  });

  it("parses --since and a repository path together in either order", () => {
    expect(parseArgs(["--since", "abc123", "/path/to/repo"])).toEqual({
      since: "abc123",
      full: false,
      repositoryPath: "/path/to/repo",
    });

    expect(parseArgs(["/path/to/repo", "--since", "abc123"])).toEqual({
      since: "abc123",
      full: false,
      repositoryPath: "/path/to/repo",
    });
  });
});
