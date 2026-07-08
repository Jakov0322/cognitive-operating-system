import "dotenv/config";

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { NormalizedEvent } from "../../knowledge/schemas/normalized-event";
import { RawSlackMessage } from "./slack-types";

async function latestFileWithPrefix(
  dir: string,
  prefix: string
): Promise<string | null> {
  let files: string[];

  try {
    files = await readdir(dir);
  } catch {
    return null;
  }

  const matched = files
    .filter((file) => file.startsWith(prefix) && file.endsWith(".json"))
    .sort()
    .reverse();

  return matched.length > 0 ? join(dir, matched[0]) : null;
}

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

function normalizeMessage(message: RawSlackMessage): NormalizedEvent {
  const now = new Date().toISOString();

  return {
    id: `slack.message.${message.channelId}.${message.ts}`,
    type: "comment.created",
    source: "slack",

    timestamp: message.createdAt,

    actor: message.authorName,
    summary: message.text,

    payload: { ...message },

    evidenceIds: [`evidence.slack.message.${message.channelId}.${message.ts}`],

    createdAt: now,
  };
}

async function main() {
  const repositoryPath = process.cwd();
  const rawDir = join(repositoryPath, "knowledge", "events", "raw", "slack");

  const messagesFile = await latestFileWithPrefix(rawDir, "messages-");

  const events: NormalizedEvent[] = [];

  if (messagesFile) {
    const messages = await readJson<RawSlackMessage[]>(messagesFile);
    events.push(...messages.map(normalizeMessage));
  }

  if (events.length === 0) {
    throw new Error(
      "No raw Slack data found. Run `npm run slack:fetch` first."
    );
  }

  const outputDir = join(repositoryPath, "knowledge", "events", "normalized");
  await mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputPath = join(outputDir, `slack-${timestamp}.json`);

  await writeFile(outputPath, JSON.stringify(events, null, 2), "utf8");

  console.log(`Normalized Slack events: ${events.length}`);
  console.log(`Saved to: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
