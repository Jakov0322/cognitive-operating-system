import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { SlackClient } from "./slack-client";

async function main() {
  const token = process.env.SLACK_BOT_TOKEN;
  const channelIdsRaw = process.env.SLACK_CHANNEL_IDS;

  if (!token || !channelIdsRaw) {
    throw new Error(
      "Missing SLACK_BOT_TOKEN or SLACK_CHANNEL_IDS in environment"
    );
  }

  const channelIds = channelIdsRaw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (channelIds.length === 0) {
    throw new Error("SLACK_CHANNEL_IDS must contain at least one channel id");
  }

  const client = new SlackClient({ token, channelIds });

  console.log(`Fetching Slack data for channels: ${channelIds.join(", ")}`);

  const users = await client.listUsers();
  const messages = await client.listMessages(users);

  const outputDir = join(
    process.cwd(),
    "knowledge",
    "events",
    "raw",
    "slack"
  );

  await mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  await writeFile(
    join(outputDir, `messages-${timestamp}.json`),
    JSON.stringify(messages, null, 2),
    "utf8"
  );

  console.log(`Messages: ${messages.length}`);
  console.log(`Saved raw Slack data to: ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
