import { readFile } from "node:fs/promises";
import { knowledgeDir, latestJsonFile } from "./workspace";

export async function readLatestProjectionOrEmpty<T>(
  projectionName: string
): Promise<T[]> {
  try {
    const file = await latestJsonFile(knowledgeDir("projections", projectionName));
    return JSON.parse(await readFile(file, "utf8")) as T[];
  } catch {
    return [];
  }
}
