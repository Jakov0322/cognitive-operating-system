import { afterEach, describe, expect, it, vi } from "vitest";
import { GitHubClient } from "./github-client";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: async () => body,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GitHubClient.createIssueComment", () => {
  it("throws without posting when no token is configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const client = new GitHubClient({ owner: "acme", repo: "widgets" });

    await expect(client.createIssueComment(1, "hello")).rejects.toThrow(
      "GitHub token is required"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("POSTs to the issue comments endpoint with the body and bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ id: 42, html_url: "https://github.com/acme/widgets/pull/1#comment-42" })
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new GitHubClient({ owner: "acme", repo: "widgets", token: "tok" });
    const result = await client.createIssueComment(1, "hello");

    expect(result).toEqual({ id: 42, url: "https://github.com/acme/widgets/pull/1#comment-42" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.github.com/repos/acme/widgets/issues/1/comments");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body)).toEqual({ body: "hello" });
  });

  it("throws when the GitHub API responds with a non-ok status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, false, 403)));

    const client = new GitHubClient({ owner: "acme", repo: "widgets", token: "tok" });

    await expect(client.createIssueComment(1, "hello")).rejects.toThrow("403");
  });
});

describe("GitHubClient.updateIssueComment", () => {
  it("PATCHes the specific comment id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ id: 42, html_url: "https://github.com/acme/widgets/pull/1#comment-42" })
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new GitHubClient({ owner: "acme", repo: "widgets", token: "tok" });
    await client.updateIssueComment(42, "updated body");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.github.com/repos/acme/widgets/issues/comments/42");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ body: "updated body" });
  });
});
