import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { LinearClient } from "./linear-client";
import { knowledgeDir } from "../../core/shared/workspace";

async function main() {
  const apiKey = process.env.LINEAR_API_KEY;

  if (!apiKey) {
    throw new Error("Missing LINEAR_API_KEY in environment");
  }

  const client = new LinearClient({ apiKey });

  console.log("Fetching Linear data");

  const { issues, comments } = await client.listIssuesAndComments();

  const outputDir = knowledgeDir("events", "raw", "linear");

  await mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  await writeFile(
    join(outputDir, `issues-${timestamp}.json`),
    JSON.stringify(issues, null, 2),
    "utf8"
  );

  await writeFile(
    join(outputDir, `comments-${timestamp}.json`),
    JSON.stringify(comments, null, 2),
    "utf8"
  );

  console.log(`Issues: ${issues.length}`);
  console.log(`Comments: ${comments.length}`);

  console.log(`Saved raw Linear data to: ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
