import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

async function run(command: string, args: string[]) {
  console.log(`\n> ${command} ${args.join(" ")}`);

  const { stdout, stderr } = await execFileAsync(command, args, {
    maxBuffer: 1024 * 1024 * 20,
    shell: true,
  });

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
  const root = process.cwd();

  await run("npm", ["run", "scan:git"]);

  try {
    await run("npm", ["run", "github:fetch"]);
    await run("npm", ["run", "github:normalize"]);
  } catch {
    console.log("Skipping GitHub ingestion (no GITHUB_TOKEN or fetch failed).");
  }

  const normalizedFiles = await allJsonFiles(
    join(root, "knowledge", "events", "normalized")
  );

  await run("npm", ["run", "extract:entities", "--", ...normalizedFiles]);
  await run("npm", ["run", "extract:relations", "--", ...normalizedFiles]);
  await run("npm", ["run", "project:timeline", "--", ...normalizedFiles]);

  const relationsFile = await latestJsonFile(
    join(root, "knowledge", "graph", "relations")
  );

  await run("npm", ["run", "project:module-activity", "--", relationsFile]);

  const moduleActivityFile = await latestJsonFile(
    join(root, "knowledge", "projections", "module-activity")
  );

  await run("npm", ["run", "infer:hotspots", "--", moduleActivityFile]);
  await run("npm", ["run", "infer:architectural-invariants"]);
  await run("npm", ["run", "infer:expertise"]);
  await run("npm", ["run", "infer:ownership-graph"]);
  await run("npm", ["run", "infer:bus-factor"]);

  const hotspotsFile = await latestJsonFile(
    join(root, "knowledge", "projections", "hotspots")
  );

  const timelineFile = await latestJsonFile(
    join(root, "knowledge", "projections", "timeline")
  );

  await run("npm", ["run", "render:module-activity", "--", moduleActivityFile]);
  await run("npm", ["run", "render:hotspots", "--", hotspotsFile]);
  await run("npm", ["run", "render:timeline", "--", timelineFile]);
  await run("npm", ["run", "render:architectural-invariants"]);
  await run("npm", ["run", "render:expertise"]);
  await run("npm", ["run", "render:ownership-graph"]);
  await run("npm", ["run", "render:bus-factor"]);
  await run("npm", ["run", "render:agent-context"]);
  await run("npm", ["run", "render:agent-workflow"]);

  await run("npm", ["run", "render:skill:risk-hotspots"]);
  await run("npm", ["run", "render:skill:architecture"]);
  await run("npm", ["run", "render:skill:codebase-navigation"]);
  await run("npm", ["run", "render:skill:project-timeline"]);
  await run("npm", ["run", "render:skill:onboarding"]);
  await run("npm", ["run", "render:skill:human-cognition"]);
  await run("npm", ["run", "render:skill:index"]);

  await run("npm", ["run", "context:core"]);
  await run("npm", ["run", "context:connectors"]);
  await run("npm", ["run", "context:knowledge"]);
  await run("npm", ["run", "context:outputs"]);

  try {
    await run("npm", ["run", "build:embeddings"]);
  } catch {
    console.log("Skipping embedding build (no VOYAGE_API_KEY or embedding request failed).");
  }

  await run("npm", ["run", "snapshot:repository"]);

  try {
    await run("npm", ["run", "compare:snapshots"]);
  } catch {
    console.log("Skipping snapshot comparison.");
  }

  try {
    await run("npm", ["run", "infer:architectural-drift"]);
  } catch {
    console.log("Skipping architectural drift inference.");
  }

  console.log("\nAnalysis completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});