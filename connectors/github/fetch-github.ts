import "dotenv/config";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { GitHubClient } from "./github-client";
import { knowledgeDir } from "../../core/shared/workspace";

async function main() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

  if (!owner || !repo) {
    throw new Error(
      "Missing GITHUB_OWNER or GITHUB_REPO in environment"
    );
  }

  const client = new GitHubClient({
    owner,
    repo,
    token,
  });

  console.log(`Fetching GitHub data for ${owner}/${repo}`);

  const pullRequests = await client.listPullRequests();
  const issues = await client.listIssues();

  const comments: unknown[] = [];

  for (const issue of issues) {
    if (!issue.number) continue;

    const parentType = issue.pull_request ? "pull_request" : "issue";

    try {
      const issueComments = await client.listIssueComments(
        issue.number,
        parentType
      );

      comments.push(...issueComments);
    } catch (error) {
      console.error(
        `Failed fetching comments for issue #${issue.number}`
      );
    }
  }

  const outputDir = knowledgeDir("events", "raw", "github");

  await mkdir(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  await writeFile(
    join(outputDir, `pull-requests-${timestamp}.json`),
    JSON.stringify(pullRequests, null, 2),
    "utf8"
  );

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

  console.log(`Pull requests: ${pullRequests.length}`);
  console.log(`Issues: ${issues.length}`);
  console.log(`Comments: ${comments.length}`);

  console.log(`Saved raw GitHub data to: ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});