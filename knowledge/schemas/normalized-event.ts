export type NormalizedEventSource =
  | "local_git"
  | "github"
  | "gitlab"
  | "jira"
  | "linear"
  | "slack"
  | "discord"
  | "notion"
  | "ci"
  | "sentry"
  | "manual";

export type NormalizedEventType =
  | "commit.created"
  | "pull_request.opened"
  | "pull_request.updated"
  | "pull_request.merged"
  | "pull_request.closed"
  | "issue.created"
  | "issue.updated"
  | "issue.closed"
  | "ci.started"
  | "ci.failed"
  | "ci.passed"
  | "incident.created"
  | "incident.updated"
  | "deployment.created"
  | "deployment.failed"
  | "deployment.succeeded"
  | "document.created"
  | "document.updated"
  | "comment.created";

export type NormalizedEvent = {
  id: string;
  type: NormalizedEventType;
  source: NormalizedEventSource;

  timestamp: string;

  actor?: string;
  title?: string;
  summary?: string;

  repository?: string;
  branch?: string;

  relatedFiles?: string[];
  relatedEntities?: string[];

  payload: Record<string, unknown>;

  evidenceIds?: string[];

  createdAt: string;
};