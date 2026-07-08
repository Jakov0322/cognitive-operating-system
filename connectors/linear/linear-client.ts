import { RawLinearComment, RawLinearIssue } from "./linear-types";

type LinearClientOptions = {
  apiKey: string;
};

type LinearApiUser = {
  name: string;
  email?: string;
} | null;

type LinearApiComment = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  user: LinearApiUser;
};

type LinearApiIssue = {
  id: string;
  identifier: string;
  title: string;
  description?: string | null;
  url: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  canceledAt?: string | null;
  state: { name: string; type: string } | null;
  assignee: LinearApiUser;
  creator: LinearApiUser;
  labels: { nodes: { name: string }[] };
  comments: { nodes: LinearApiComment[] };
};

type IssuesQueryResponse = {
  data?: {
    issues: {
      nodes: LinearApiIssue[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  };
  errors?: Array<{ message: string }>;
};

const ISSUES_QUERY = `
  query Issues($after: String) {
    issues(first: 50, after: $after, orderBy: updatedAt) {
      nodes {
        id
        identifier
        title
        description
        url
        priority
        createdAt
        updatedAt
        completedAt
        canceledAt
        state { name type }
        assignee { name email }
        creator { name email }
        labels { nodes { name } }
        comments {
          nodes {
            id
            body
            createdAt
            updatedAt
            url
            user { name email }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

function mapIssue(raw: LinearApiIssue): RawLinearIssue {
  return {
    id: raw.id,
    identifier: raw.identifier,
    title: raw.title,
    description: raw.description,
    url: raw.url,
    priority: raw.priority,
    stateName: raw.state?.name ?? "Unknown",
    stateType: raw.state?.type ?? "unstarted",
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    completedAt: raw.completedAt,
    canceledAt: raw.canceledAt,
    assigneeName: raw.assignee?.name,
    creatorName: raw.creator?.name ?? "unknown",
    labels: (raw.labels?.nodes ?? []).map((label) => label.name),
  };
}

function mapComments(raw: LinearApiIssue): RawLinearComment[] {
  return (raw.comments?.nodes ?? []).map((comment) => ({
    id: comment.id,
    body: comment.body,
    authorName: comment.user?.name ?? "unknown",
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    url: comment.url,
    parentIdentifier: raw.identifier,
  }));
}

export class LinearClient {
  private readonly endpoint = "https://api.linear.app/graphql";
  private readonly maxPages = 20;

  constructor(private readonly options: LinearClientOptions) {}

  private async request(after: string | null): Promise<IssuesQueryResponse> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.options.apiKey,
      },
      body: JSON.stringify({
        query: ISSUES_QUERY,
        variables: { after },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Linear request failed: ${response.status} ${response.statusText}`
      );
    }

    const json = (await response.json()) as IssuesQueryResponse;

    if (json.errors && json.errors.length > 0) {
      throw new Error(
        `Linear GraphQL error: ${json.errors.map((e) => e.message).join(", ")}`
      );
    }

    if (!json.data) {
      throw new Error("Linear GraphQL response missing data");
    }

    return json;
  }

  async listIssuesAndComments(): Promise<{
    issues: RawLinearIssue[];
    comments: RawLinearComment[];
  }> {
    const issues: RawLinearIssue[] = [];
    const comments: RawLinearComment[] = [];

    let after: string | null = null;
    let hasNextPage = true;
    let pageCount = 0;

    while (hasNextPage && pageCount < this.maxPages) {
      const response = await this.request(after);
      const page = response.data!.issues;

      for (const node of page.nodes) {
        issues.push(mapIssue(node));
        comments.push(...mapComments(node));
      }

      hasNextPage = page.pageInfo.hasNextPage;
      after = page.pageInfo.endCursor;
      pageCount += 1;
    }

    return { issues, comments };
  }
}
