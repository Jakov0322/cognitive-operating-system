import { RawCIRun } from "./ci-types";

type CIClientOptions = {
  owner: string;
  repo: string;
  token?: string;
};

type GitHubApiActor = { login: string } | null;

type GitHubApiWorkflowRun = {
  id: number;
  name: string | null;
  path?: string;
  head_branch: string;
  head_sha: string;
  status: "queued" | "in_progress" | "completed";
  conclusion: RawCIRun["conclusion"];
  event: string;
  actor: GitHubApiActor;
  created_at: string;
  updated_at: string;
  run_started_at?: string | null;
  html_url: string;
};

type GitHubApiWorkflowRunsResponse = {
  total_count: number;
  workflow_runs: GitHubApiWorkflowRun[];
};

function mapWorkflowRun(raw: GitHubApiWorkflowRun): RawCIRun {
  return {
    id: raw.id,
    name: raw.name ?? "unknown",
    workflowName: raw.path,
    headBranch: raw.head_branch,
    headSha: raw.head_sha,
    status: raw.status,
    conclusion: raw.conclusion,
    event: raw.event,
    actorLogin: raw.actor?.login ?? "unknown",
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    runStartedAt: raw.run_started_at,
    url: raw.html_url,
  };
}

export class CIClient {
  private readonly baseUrl = "https://api.github.com";

  constructor(private readonly options: CIClientOptions) {}

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
        `CI request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json() as Promise<T>;
  }

  async listWorkflowRuns(): Promise<RawCIRun[]> {
    const raw = await this.request<GitHubApiWorkflowRunsResponse>(
      `/repos/${this.options.owner}/${this.options.repo}/actions/runs?per_page=100`
    );

    return raw.workflow_runs.map(mapWorkflowRun);
  }
}
