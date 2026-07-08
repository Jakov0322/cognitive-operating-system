export type RawCIRun = {
  id: number;
  name: string;
  workflowName?: string;
  headBranch: string;
  headSha: string;
  status: "queued" | "in_progress" | "completed";
  conclusion:
    | "success"
    | "failure"
    | "cancelled"
    | "skipped"
    | "timed_out"
    | "action_required"
    | "stale"
    | "neutral"
    | null;
  event: string;
  actorLogin: string;
  createdAt: string;
  updatedAt: string;
  runStartedAt?: string | null;
  url: string;
};
