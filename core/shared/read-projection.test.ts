import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readLatestProjectionOrEmpty } from "./read-projection";

describe("readLatestProjectionOrEmpty", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns an empty array when the projection directory doesn't exist", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "cognitive-os-test-"));
    vi.stubEnv("COGNITIVE_OS_DATA_DIR", dataDir);

    try {
      expect(await readLatestProjectionOrEmpty("does-not-exist")).toEqual([]);
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });

  it("reads and parses the most recently named JSON file in the projection directory", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "cognitive-os-test-"));
    vi.stubEnv("COGNITIVE_OS_DATA_DIR", dataDir);

    const dir = join(dataDir, "knowledge", "projections", "hotspots");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "hotspots-1.json"), JSON.stringify([{ moduleId: "old" }]), "utf8");
    await writeFile(join(dir, "hotspots-2.json"), JSON.stringify([{ moduleId: "new" }]), "utf8");

    try {
      const result = await readLatestProjectionOrEmpty<{ moduleId: string }>("hotspots");
      expect(result).toEqual([{ moduleId: "new" }]);
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });
});
