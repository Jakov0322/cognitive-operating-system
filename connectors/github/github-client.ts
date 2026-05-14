type GitHubClientOptions = {
  owner: string;
  repo: string;
  token?: string;
};

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

  async listPullRequests() {
    return this.request<unknown[]>(
      `/repos/${this.options.owner}/${this.options.repo}/pulls?state=all&per_page=100`
    );
  }

  async listIssues() {
    return this.request<unknown[]>(
      `/repos/${this.options.owner}/${this.options.repo}/issues?state=all&per_page=100`
    );
  }

  async listIssueComments(issueNumber: number) {
    return this.request<unknown[]>(
      `/repos/${this.options.owner}/${this.options.repo}/issues/${issueNumber}/comments?per_page=100`
    );
  }
}