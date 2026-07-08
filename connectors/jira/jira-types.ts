export type RawJiraIssue = {
  id: string;
  key: string;
  summary: string;
  description: string;
  statusName: string;
  statusCategory: string;
  issueType: string;
  priority?: string;
  assigneeName?: string | null;
  reporterName: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  url: string;
};

export type RawJiraComment = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  parentKey: string;
};
