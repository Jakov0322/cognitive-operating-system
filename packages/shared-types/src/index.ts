export const ANALYSIS_RUN_STATUSES = [
  "queued",
  "cloning",
  "running",
  "completed",
  "failed",
  "canceled",
] as const;

export type AnalysisRunStatus = (typeof ANALYSIS_RUN_STATUSES)[number];

export type HealthResponse = {
  status: "ok";
  service: string;
  timestamp: string;
};
