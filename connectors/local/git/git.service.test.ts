import { beforeEach, describe, expect, it, vi } from "vitest";

type ExecFileCallback = (error: Error | null, result: { stdout: string; stderr: string }) => void;

const execFileMock = vi.fn(
  (_file: string, _args: string[], _options: unknown, callback: ExecFileCallback) => {
    callback(null, { stdout: "mocked-output\n", stderr: "" });
  }
);

vi.mock("node:child_process", () => ({
  execFile: (...args: Parameters<typeof execFileMock>) => execFileMock(...args),
}));

const { GitService } = await import("./git.service");

describe("GitService", () => {
  beforeEach(() => {
    execFileMock.mockReset();
    execFileMock.mockImplementation((_file, _args, _options, callback) => {
      callback(null, { stdout: "mocked-output\n", stderr: "" });
    });
  });

  it("log() without a ref runs a plain git log over the whole history", async () => {
    const git = new GitService("/repo");
    await git.log();

    const [, args] = execFileMock.mock.calls[0];
    expect(args).toEqual([
      "log",
      "--name-only",
      "--pretty=format:%x1e%H%x1f%an%x1f%ae%x1f%aI%x1f%s",
    ]);
  });

  it("log(since) scopes the range to since..HEAD", async () => {
    const git = new GitService("/repo");
    await git.log("abc123");

    const [, args] = execFileMock.mock.calls[0];
    expect(args[0]).toBe("log");
    expect(args[1]).toBe("abc123..HEAD");
  });

  it("getHeadSha() trims the resolved HEAD sha", async () => {
    execFileMock.mockImplementation((_file, _args, _options, callback) => {
      callback(null, { stdout: "deadbeef\n", stderr: "" });
    });

    const git = new GitService("/repo");
    expect(await git.getHeadSha()).toBe("deadbeef");
  });

  it("refExists() returns true when git rev-parse succeeds", async () => {
    const git = new GitService("/repo");
    expect(await git.refExists("abc123")).toBe(true);
  });

  it("refExists() returns false when git rev-parse fails, instead of throwing", async () => {
    execFileMock.mockImplementation((_file, _args, _options, callback) => {
      callback(new Error("unknown revision"), { stdout: "", stderr: "" });
    });

    const git = new GitService("/repo");
    expect(await git.refExists("missing-sha")).toBe(false);
  });

  it("runs every git command in the configured repository path", async () => {
    const git = new GitService("/some/repo");
    await git.log();

    const [, , options] = execFileMock.mock.calls[0];
    expect((options as { cwd: string }).cwd).toBe("/some/repo");
  });
});
