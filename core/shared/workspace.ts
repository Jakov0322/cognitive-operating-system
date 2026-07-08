import { readdir } from "node:fs/promises";
import { join } from "node:path";

export function getRepoRoot(): string {
  return process.env.COGNITIVE_OS_REPO_ROOT ?? process.cwd();
}

export function getDataRoot(): string {
  return process.env.COGNITIVE_OS_DATA_DIR ?? join(getRepoRoot(), ".cognitive-os");
}

export function knowledgeDir(...segments: string[]): string {
  return join(getDataRoot(), "knowledge", ...segments);
}

export function outputsDir(...segments: string[]): string {
  return join(getDataRoot(), "outputs", ...segments);
}

export async function latestJsonFile(dir: string): Promise<string> {
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
