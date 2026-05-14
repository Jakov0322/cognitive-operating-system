export type EvidenceSourceType =
  | "file"
  | "commit"
  | "pull_request"
  | "issue"
  | "ci_failure"
  | "incident"
  | "documentation"
  | "manual_note";

export type EvidenceRef = {
  id: string;
  type: EvidenceSourceType;
  uri?: string;
  repository?: string;
  path?: string;
  commitSha?: string;
  pullRequestNumber?: number;
  issueNumber?: number;
  excerpt?: string;
  capturedAt: string;
};