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

async function main() {
  const root = process.cwd();

  await run("npm", ["run", "scan:git"]);

  const normalizedFile = await latestJsonFile(
    join(root, "knowledge", "events", "normalized")
  );

  await run("npm", ["run", "extract:entities", "--", normalizedFile]);
  await run("npm", ["run", "extract:relations", "--", normalizedFile]);
  await run("npm", ["run", "project:timeline", "--", normalizedFile]);

  const relationsFile = await latestJsonFile(
    join(root, "knowledge", "graph", "relations")
  );

  await run("npm", ["run", "project:module-activity", "--", relationsFile]);

  const moduleActivityFile = await latestJsonFile(
    join(root, "knowledge", "projections", "module-activity")
  );

  await run("npm", ["run", "infer:hotspots", "--", moduleActivityFile]);

  const hotspotsFile = await latestJsonFile(
    join(root, "knowledge", "projections", "hotspots")
  );

  const timelineFile = await latestJsonFile(
    join(root, "knowledge", "projections", "timeline")
  );

  await run("npm", ["run", "render:module-activity", "--", moduleActivityFile]);
  await run("npm", ["run", "render:hotspots", "--", hotspotsFile]);
  await run("npm", ["run", "render:timeline", "--", timelineFile]);
  await run("npm", ["run", "render:agent-context"]);
  await run("npm", ["run", "render:skill:risk-hotspots"]);
  await run("npm", ["run", "render:skill:architecture"]);
  await run("npm", ["run", "render:skill:codebase-navigation"]);
  await run("npm", ["run", "render:skill:project-timeline"]);
  await run("npm", ["run", "render:skill:onboarding"]);
  await run("npm", ["run", "render:skill:index"]);
  await run("npm", ["run", "context:core"]);
  await run("npm", ["run", "context:connectors"]);
  await run("npm", ["run", "context:knowledge"]);
  await run("npm", ["run", "context:outputs"]);

  console.log("\nAnalysis completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});