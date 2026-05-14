export type RawGitHubPullRequest = {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  merged: boolean;
  authorLogin: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  mergedAt?: string | null;
  url: string;
  body?: string | null;
  labels: string[];
};

export type RawGitHubIssue = {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  authorLogin: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  url: string;
  body?: string | null;
  labels: string[];
};

export type RawGitHubComment = {
  id: number;
  body: string;
  authorLogin: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  parentType: "pull_request" | "issue";
  parentNumber: number;
};