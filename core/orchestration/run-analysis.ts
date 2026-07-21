import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getRepoRoot, knowledgeDir } from "../shared/workspace";

const execFileAsync = promisify(execFile);

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const PACKAGE_ROOT = join(__dirname, "..", "..");
const TSX_CLI = require.resolve("tsx/cli");

async function runScript(relativeScriptPath: string, args: string[] = []) {
  console.log(`\n> tsx ${relativeScriptPath} ${args.join(" ")}`);

  const { stdout, stderr } = await execFileAsync(
    process.execPath,
    [TSX_CLI, join(PACKAGE_ROOT, relativeScriptPath), ...args],
    { maxBuffer: 1024 * 1024 * 20, cwd: getRepoRoot() }
  );

  if (stdout) console.log(stdout);
  if (stderr) console.error(stderr);
}

async function latestJsonFile(dir: string): Promise<string> {
  const files = await readdir(dir);

  const jsonFiles = files
    .filter((file) => file.endsWith(".json"))
    .sort()
    .reverse();

  if (jsonFiles.length === 0) {
    throw new Error(`No JSON files found in ${dir}`);
  }

  return join(dir, jsonFiles[0]);
}

async function allJsonFiles(dir: string): Promise<string[]> {
  const files = await readdir(dir);

  return files
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => join(dir, file));
}

async function main() {
  await runScript("connectors/local/git/scan-git.ts");

  try {
    await runScript("connectors/github/fetch-github.ts");
    await runScript("connectors/github/normalize-github-events.ts");
  } catch {
    console.log("Skipping GitHub ingestion (no GITHUB_TOKEN or fetch failed).");
  }

  try {
    await runScript("connectors/linear/fetch-linear.ts");
    await runScript("connectors/linear/normalize-linear-events.ts");
  } catch {
    console.log("Skipping Linear ingestion (no LINEAR_API_KEY or fetch failed).");
  }

  try {
    await runScript("connectors/ci/fetch-ci.ts");
    await runScript("connectors/ci/normalize-ci-events.ts");
  } catch {
    console.log("Skipping CI ingestion (no GITHUB_TOKEN or fetch failed).");
  }

  try {
    await runScript("connectors/jira/fetch-jira.ts");
    await runScript("connectors/jira/normalize-jira-events.ts");
  } catch {
    console.log("Skipping Jira ingestion (missing Jira credentials or fetch failed).");
  }

  try {
    await runScript("connectors/slack/fetch-slack.ts");
    await runScript("connectors/slack/normalize-slack-events.ts");
  } catch {
    console.log("Skipping Slack ingestion (missing Slack credentials or fetch failed).");
  }

  const normalizedFiles = await allJsonFiles(
    knowledgeDir("events", "normalized")
  );

  await runScript("core/entity-extraction/run-entity-extraction.ts", normalizedFiles);
  await runScript("core/relation-extraction/run-relation-extraction.ts", normalizedFiles);
  await runScript("core/timeline-engine/build-activity-timeline.ts", normalizedFiles);

  const relationsFile = await latestJsonFile(
    knowledgeDir("graph", "relations")
  );

  await runScript("core/timeline-engine/build-module-activity.ts", [relationsFile]);

  const moduleActivityFile = await latestJsonFile(
    knowledgeDir("projections", "module-activity")
  );

  await runScript("core/inference/infer-hotspots.ts", [moduleActivityFile]);
  await runScript("core/inference/infer-architectural-invariants.ts");
  await runScript("core/inference/infer-expertise.ts");
  await runScript("core/inference/build-ownership-graph.ts");
  await runScript("core/inference/infer-bus-factor.ts");

  const hotspotsFile = await latestJsonFile(
    knowledgeDir("projections", "hotspots")
  );

  const timelineFile = await latestJsonFile(
    knowledgeDir("projections", "timeline")
  );

  await runScript("outputs/reports/render-module-activity.ts", [moduleActivityFile]);
  await runScript("outputs/reports/render-hotspots.ts", [hotspotsFile]);
  await runScript("outputs/reports/render-timeline.ts", [timelineFile]);
  await runScript("outputs/reports/render-architectural-invariants.ts");
  await runScript("outputs/reports/render-expertise.ts");
  await runScript("outputs/reports/render-ownership-graph.ts");
  await runScript("outputs/reports/render-bus-factor.ts");
  await runScript("outputs/agent-context/render-agent-context.ts");
  await runScript("outputs/agent-context/render-agent-workflow.ts");

  await runScript("outputs/skills/render-risk-hotspots-skill.ts");
  await runScript("outputs/skills/render-architecture-skill.ts");
  await runScript("outputs/skills/render-codebase-navigation-skill.ts");
  await runScript("outputs/skills/render-project-timeline-skill.ts");
  await runScript("outputs/skills/render-onboarding-skill.ts");
  await runScript("outputs/skills/render-human-cognition-skill.ts");
  await runScript("outputs/skills/render-skill-index.ts");

  await runScript("outputs/context-packs/render-context-pack.ts", ["core"]);
  await runScript("outputs/context-packs/render-context-pack.ts", ["connectors"]);
  await runScript("outputs/context-packs/render-context-pack.ts", ["knowledge"]);
  await runScript("outputs/context-packs/render-context-pack.ts", ["outputs"]);

  try {
    await runScript("core/embeddings/build-embeddings.ts");
  } catch {
    console.log("Skipping embedding build (no VOYAGE_API_KEY or embedding request failed).");
  }

  await runScript("core/memory/build-repository-snapshot.ts");

  try {
    await runScript("core/memory/compare-snapshots.ts");
  } catch {
    console.log("Skipping snapshot comparison.");
  }

  try {
    await runScript("core/inference/infer-architectural-drift.ts");
  } catch {
    console.log("Skipping architectural drift inference.");
  }

  console.log("\nAnalysis completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});