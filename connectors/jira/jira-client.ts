import { RawJiraComment, RawJiraIssue } from "./jira-types";

type JiraClientOptions = {
  baseUrl: string;
  email: string;
  apiToken: string;
  projectKey?: string;
};

type ADFNode = {
  type?: string;
  text?: string;
  content?: ADFNode[];
};

type JiraApiUser = { displayName: string } | null;

type JiraApiIssueFields = {
  summary: string;
  description?: ADFNode | null;
  status: { name: string; statusCategory: { key: string } };
  issuetype: { name: string };
  priority?: { name: string } | null;
  assignee: JiraApiUser;
  reporter: JiraApiUser;
  labels: string[];
  created: string;
  updated: string;
  resolutiondate?: string | null;
};

type JiraApiIssue = {
  id: string;
  key: string;
  fields: JiraApiIssueFields;
};

type JiraSearchResponse = {
  issues: JiraApiIssue[];
  total: number;
  startAt: number;
  maxResults: number;
};

type JiraApiComment = {
  id: string;
  body?: ADFNode | null;
  author: JiraApiUser;
  created: string;
  updated: string;
};

type JiraCommentsResponse = {
  comments: JiraApiComment[];
  total: number;
};

function adfToText(node?: ADFNode | null): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (!node.content) return "";

  const separator = node.type === "paragraph" || node.type === "heading" ? "\n" : "";

  return node.content.map(adfToText).join(separator);
}

function mapIssue(raw: JiraApiIssue, baseUrl: string): RawJiraIssue {
  const fields = raw.fields;

  return {
    id: raw.id,
    key: raw.key,
    summary: fields.summary,
    description: adfToText(fields.description),
    statusName: fields.status?.name ?? "Unknown",
    statusCategory: fields.status?.statusCategory?.key ?? "new",
    issueType: fields.issuetype?.name ?? "Task",
    priority: fields.priority?.name,
    assigneeName: fields.assignee?.displayName,
    reporterName: fields.reporter?.displayName ?? "unknown",
    labels: fields.labels ?? [],
    createdAt: fields.created,
    updatedAt: fields.updated,
    resolvedAt: fields.resolutiondate,
    url: `${baseUrl}/browse/${raw.key}`,
  };
}

function mapComment(raw: JiraApiComment, parentKey: string): RawJiraComment {
  return {
    id: raw.id,
    body: adfToText(raw.body),
    authorName: raw.author?.displayName ?? "unknown",
    createdAt: raw.created,
    updatedAt: raw.updated,
    parentKey,
  };
}

export class JiraClient {
  private readonly maxPages = 20;

  constructor(private readonly options: JiraClientOptions) {}

  private authHeader(): string {
    const token = Buffer.from(
      `${this.options.email}:${this.options.apiToken}`
    ).toString("base64");

    return `Basic ${token}`;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.options.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: this.authHeader(),
        ...(init?.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(
        `Jira request failed: ${response.status} ${response.statusText}`
      );
    }

    return response.json() as Promise<T>;
  }

  async listIssues(): Promise<RawJiraIssue[]> {
    const issues: RawJiraIssue[] = [];

    const jql = this.options.projectKey
      ? `project = "${this.options.projectKey}" ORDER BY updated DESC`
      : "ORDER BY updated DESC";

    let startAt = 0;
    let page = 0;

    while (page < this.maxPages) {
      const response = await this.request<JiraSearchResponse>(
        "/rest/api/3/search",
        {
          method: "POST",
          body: JSON.stringify({
            jql,
            startAt,
            maxResults: 100,
            fields: [
              "summary",
              "description",
              "status",
              "issuetype",
              "priority",
              "assignee",
              "reporter",
              "labels",
              "created",
              "updated",
              "resolutiondate",
            ],
          }),
        }
      );

      issues.push(
        ...response.issues.map((issue) => mapIssue(issue, this.options.baseUrl))
      );

      startAt += response.issues.length;
      page += 1;

      if (response.issues.length === 0 || startAt >= response.total) break;
    }

    return issues;
  }

  async listComments(issueKey: string): Promise<RawJiraComment[]> {
    const response = await this.request<JiraCommentsResponse>(
      `/rest/api/3/issue/${issueKey}/comment?maxResults=100`
    );

    return response.comments.map((comment) => mapComment(comment, issueKey));
  }
}
