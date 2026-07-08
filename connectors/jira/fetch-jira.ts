import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { JiraClient } from "./jira-client";
import { RawJiraComment } from "./jira-types";
import { knowledgeDir } from "../../core/shared/workspace";

async function main() {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  const projectKey = process.env.JIRA_PROJECT_KEY;

  if (!baseUrl || !email || !apiToken) {
    throw new Error(
      "Missing JIRA_BASE_URL, JIRA_EMAIL, or JIRA_API_TOKEN in environment"
    );
  }

  const client = new JiraClient({ baseUrl, email, apiToken, projectKey });

  console.log(
    `Fetching Jira data from ${baseUrl}${projectKey ? ` (project ${projectKey})` : ""}`
  );

  const issues = await client.listIssues();

  const comments: RawJiraComment[] = [];

  for (const issue of issues) {
    try {
      comments.push(...(await client.listComments(issue.key)));
    } catch (error) {
      console.error(`Failed fetching comments for issue ${issue.key}`);
    }
  }

  const outputDir = knowledgeDir("events", "raw", "jira");
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

  console.log(`Saved raw Jira data to: ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
