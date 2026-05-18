import { NormalizedEvent } from "../../knowledge/schemas/normalized-event";
import { shouldIgnoreForChangeWeight } from "./path-filters";

export type EventClassification =
  | "scaffold"
  | "evolution"
  | "maintenance"
  | "unknown";

export function classifyEvent(event: NormalizedEvent): EventClassification {
  const title = `${event.title ?? ""} ${event.summary ?? ""}`.toLowerCase();
  const files = event.relatedFiles ?? [];

  const meaningfulFiles = files.filter((file) => !shouldIgnoreForChangeWeight(file));

  const scaffoldKeywords = [
    "initial commit",
    "first commit",
    "scaffold",
    "bootstrap",
    "initial structure",
    "project structure",
    "create structure",
  ];

  if (scaffoldKeywords.some((keyword) => title.includes(keyword))) {
    return "scaffold";
  }

  const gitkeepCount = files.filter((file) => file.endsWith(".gitkeep")).length;

  if (files.length > 0 && gitkeepCount / files.length >= 0.5) {
    return "scaffold";
  }

  if (meaningfulFiles.length === 0) {
    return "maintenance";
  }

  return "evolution";
}