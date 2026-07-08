export type RawLinearIssue = {
  id: string;
  identifier: string;
  title: string;
  description?: string | null;
  url: string;
  priority: number;
  stateName: string;
  stateType: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  canceledAt?: string | null;
  assigneeName?: string | null;
  creatorName: string;
  labels: string[];
};

export type RawLinearComment = {
  id: string;
  body: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  parentIdentifier: string;
};
