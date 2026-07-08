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
