import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { NormalizedEvent } from "../../knowledge/schemas/normalized-event";
import { classifyEvent } from "../shared/event-classification";
import { shouldIgnoreForModuleInference } from "../shared/path-filters";

type TimelineDay = {
  date: string;
  changeCount: number;
  eventCount: number;
  classifications: Record<string, number>;
  modules: string[];
  evidenceIds: string[];
};

function inferModuleName(filePath: string): string | null {
  const segments = filePath.split(/[\\/]/).filter(Boolean);

  if (segments.length === 0) return null;
  if (segments[0] === "src" && segments.length > 1) return segments[1];
  if (segments[0] === "apps" && segments.length > 1) return segments[1];
  if (segments[0] === "packages" && segments.length > 1) return segments[1];

  return segments[0];
}

function eventWeight(event: NormalizedEvent): number {
  const classification = classifyEvent(event);

  if (classification === "scaffold") return 0.25;
  if (classification === "maintenance") return 0.5;

  return 1;
}

function eventDate(event: NormalizedEvent): string {
  return event.timestamp.slice(0, 10);
}

function buildActivityTimeline(events: NormalizedEvent[]): TimelineDay[] {
  const days = new Map<string, TimelineDay>();

  for (const event of events) {
    const date = eventDate(event);
    const classification = classifyEvent(event);
    const weight = eventWeight(event);

    const modules = Array.from(
      new Set(
        (event.relatedFiles ?? [])
          .filter((file) => !shouldIgnoreForModuleInference(file))
          .map(inferModuleName)
          .filter((value): value is string => Boolean(value))
          .map((name) => `module.${name}`)
      )
    );

    const existing =
      days.get(date) ??
      {
        date,
        changeCount: 0,
        eventCount: 0,
        classifications: {},
        modules: [],
        evidenceIds: [],
      };

    existing.changeCount += weight;
    existing.eventCount += 1;

    existing.classifications[classification] =
      (existing.classifications[classification] ?? 0) + 1;

    existing.modules = Array.from(new Set([...existing.modules, ...modules]));

    existing.evidenceIds = Array.from(
      new Set([...existing.evidenceIds, ...(event.evidenceIds ?? [])])
    );

    days.set(date, existing);
  }

  return Array.from(days.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

async function main() {
  const repositoryPath = process.cwd();
  const files = process.argv.slice(2);

  if (files.length === 0) {
    throw new Error("Provide at least one normalized events file path as argument");
  }

  const events: NormalizedEvent[] = [];

  for (const file of files) {
    const raw = await readFile(file, "utf8");
    events.push(...(JSON.parse(raw) as NormalizedEvent[]));
  }

  const timeline = buildActivityTimeline(events);

  const outputDir = join(repositoryPath, "knowledge", "projections", "timeline");
  await mkdir(outputDir, { recursive: true });

  const outputPath = join(outputDir, `activity-timeline-${Date.now()}.json`);

  await writeFile(outputPath, JSON.stringify(timeline, null, 2), "utf8");

  console.log(`Timeline days: ${timeline.length}`);
  console.log(`Saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});