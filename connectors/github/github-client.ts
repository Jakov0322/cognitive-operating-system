import {
  RawGitHubComment,
  RawGitHubIssue,
  RawGitHubPullRequest,
} from "./github-types";

type GitHubClientOptions = {
  owner: string;
  repo: string;
  token?: string;
};

type GitHubApiUser = {
  login: string;
} | null;

type GitHubApiLabel = string | { name?: string };

type GitHubApiPullRequest = {
  number: number;
  title: string;
  state: "open" | "closed";
  merged_at?: string | null;
  user: GitHubApiUser;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  html_url: string;
  body?: string | null;
  labels?: GitHubApiLabel[];
};

type GitHubApiIssue = GitHubApiPullRequest & {
  pull_request?: unknown;
};

type GitHubApiComment = {
  id: number;
  body: string;
  user: GitHubApiUser;
  created_at: string;
  updated_at: string;
  html_url: string;
};

function labelName(label: GitHubApiLabel): string {
  return typeof label === "string" ? label : label.name ?? "";
}

function mapPullRequest(raw: GitHubApiPullRequest): RawGitHubPullRequest {
  return {
    id: raw.number,
    number: raw.number,
    title: raw.title,
    state: raw.state,
    merged: Boolean(raw.merged_at),
    authorLogin: raw.user?.login ?? "unknown",
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    closedAt: raw.closed_at,
    mergedAt: raw.merged_at,
    url: raw.html_url,
    body: raw.body,
    labels: (raw.labels ?? []).map(labelName),
  };
}

function mapIssue(raw: GitHubApiIssue): RawGitHubIssue & { pull_request?: unknown } {
  return {
    id: raw.number,
    number: raw.number,
    title: raw.title,
    state: raw.state,
    authorLogin: raw.user?.login ?? "unknown",
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    closedAt: raw.closed_at,
    url: raw.html_url,
    body: raw.body,
    labels: (raw.labels ?? []).map(labelName),
    pull_request: raw.pull_request,
  };
}

function mapComment(
  raw: GitHubApiComment,
  parentType: "issue" | "pull_request",
  parentNumber: number
): RawGitHubComment {
  return {
    id: raw.id,
    body: raw.body,
    authorLogin: raw.user?.login ?? "unknown",
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    url: raw.html_url,
    parentType,
    parentNumber,
  };
}

export class GitHubClient {
  private readonly baseUrl = "https://api.github.com";

  constructor(private readonly options: GitHubClientOptions) {}

  private async request<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(this.options.token
          ? { Authorization: `Bearer ${this.options.token}` }
          : {}),
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      throw new Error(
        `GitHub request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json() as Promise<T>;
  }

  private async write<T>(
    path: string,
    method: "POST" | "PATCH",
    body: unknown
  ): Promise<T> {
    if (!this.options.token) {
      throw new Error("GitHub token is required to write to the GitHub API");
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.options.token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(
        `GitHub request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json() as Promise<T>;
  }

  async listPullRequests(): Promise<RawGitHubPullRequest[]> {
    const raw = await this.request<GitHubApiPullRequest[]>(
      `/repos/${this.options.owner}/${this.options.repo}/pulls?state=all&per_page=100`
    );

    return raw.map(mapPullRequest);
  }

  async listIssues(): Promise<Array<RawGitHubIssue & { pull_request?: unknown }>> {
    const raw = await this.request<GitHubApiIssue[]>(
      `/repos/${this.options.owner}/${this.options.repo}/issues?state=all&per_page=100`
    );

    return raw.map(mapIssue);
  }

  async listIssueComments(
    issueNumber: number,
    parentType: "issue" | "pull_request" = "issue"
  ): Promise<RawGitHubComment[]> {
    const raw = await this.request<GitHubApiComment[]>(
      `/repos/${this.options.owner}/${this.options.repo}/issues/${issueNumber}/comments?per_page=100`
    );

    return raw.map((comment) => mapComment(comment, parentType, issueNumber));
  }

  async createIssueComment(
    issueNumber: number,
    body: string
  ): Promise<{ id: number; url: string }> {
    const raw = await this.write<GitHubApiComment>(
      `/repos/${this.options.owner}/${this.options.repo}/issues/${issueNumber}/comments`,
      "POST",
      { body }
    );

    return { id: raw.id, url: raw.html_url };
  }

  async updateIssueComment(
    commentId: number,
    body: string
  ): Promise<{ id: number; url: string }> {
    const raw = await this.write<GitHubApiComment>(
      `/repos/${this.options.owner}/${this.options.repo}/issues/comments/${commentId}`,
      "PATCH",
      { body }
    );

    return { id: raw.id, url: raw.html_url };
  }
}
