import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { CIClient } from "./ci-client";

async function main() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

  if (!owner || !repo) {
    throw new Error("Missing GITHUB_OWNER or GITHUB_REPO in environment");
  }

  const client = new CIClient({ owner, repo, token });

  console.log(`Fetching CI runs for ${owner}/${repo}`);

  const runs = await client.listWorkflowRuns();

  const outputDir = join(process.cwd(), "knowledge", "events", "raw", "ci");
  await mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  await writeFile(
    join(outputDir, `runs-${timestamp}.json`),
    JSON.stringify(runs, null, 2),
    "utf8"
  );

  console.log(`Workflow runs: ${runs.length}`);
  console.log(`Saved raw CI data to: ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
