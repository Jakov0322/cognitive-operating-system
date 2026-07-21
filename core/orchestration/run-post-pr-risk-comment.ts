import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { GitHubClient } from "../../connectors/github/github-client";
import { ArchitecturalInvariant } from "../../knowledge/schemas/architectural-invariant";
import { BusFactorRisk } from "../../knowledge/schemas/bus-factor";
import { ExpertiseProfile } from "../../knowledge/schemas/expertise-profile";
import { checkChangeRisk } from "../inference/check-change-risk";
import { readLatestProjectionOrEmpty } from "../shared/read-projection";
import {
  CHANGE_RISK_COMMENT_MARKER,
  renderChangeRiskComment,
} from "../../outputs/reports/render-change-risk-comment";

export async function parseFileArgs(argv: string[]): Promise<string[]> {
  if (argv[0] === "--files-from") {
    const path = argv[1];

    if (!path) {
      throw new Error("--files-from requires a file path argument");
    }

    const raw = await readFile(path, "utf8");

    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return argv.filter(Boolean);
}

async function main() {
  const files = await parseFileArgs(process.argv.slice(2));

  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  const prNumber = Number(process.env.PR_NUMBER);

  if (!owner || !repo || !token) {
    throw new Error("Missing GITHUB_OWNER, GITHUB_REPO, or GITHUB_TOKEN in environment");
  }

  if (!Number.isInteger(prNumber)) {
    throw new Error("Missing or invalid PR_NUMBER in environment");
  }

  if (files.length === 0) {
    console.log("No changed files provided, skipping risk comment.");
    return;
  }

  const [hotspots, busFactorRisks, invariants, expertiseProfiles] = await Promise.all([
    readLatestProjectionOrEmpty<{ moduleId: string; hotspotScore: number; reasons: string[] }>("hotspots"),
    readLatestProjectionOrEmpty<BusFactorRisk>("bus-factor"),
    readLatestProjectionOrEmpty<ArchitecturalInvariant>("architectural-invariants"),
    readLatestProjectionOrEmpty<ExpertiseProfile>("expertise"),
  ]);

  const report = checkChangeRisk(files, {
    hotspots,
    busFactorRisks,
    invariants,
    expertiseProfiles,
  });

  const body = renderChangeRiskComment(report);

  const client = new GitHubClient({ owner, repo, token });

  const existingComments = await client.listIssueComments(prNumber, "pull_request");
  const existing = existingComments.find((comment) => comment.body.startsWith(CHANGE_RISK_COMMENT_MARKER));

  if (existing) {
    const updated = await client.updateIssueComment(existing.id, body);
    console.log(`Updated risk comment: ${updated.url}`);
  } else {
    const created = await client.createIssueComment(prNumber, body);
    console.log(`Posted risk comment: ${created.url}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
