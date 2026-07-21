import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readScanCursor, writeScanCursor } from "./scan-cursor";

describe("scan cursor", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when no cursor has been written yet", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "cognitive-os-test-"));
    vi.stubEnv("COGNITIVE_OS_DATA_DIR", dataDir);

    try {
      expect(await readScanCursor()).toBeNull();
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });

  it("round-trips the last scanned sha through write then read", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "cognitive-os-test-"));
    vi.stubEnv("COGNITIVE_OS_DATA_DIR", dataDir);

    try {
      await writeScanCursor("abc123");
      const cursor = await readScanCursor();

      expect(cursor?.lastScannedSha).toBe("abc123");
      expect(typeof cursor?.scannedAt).toBe("string");
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });

  it("overwrites the previous cursor on a subsequent write", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "cognitive-os-test-"));
    vi.stubEnv("COGNITIVE_OS_DATA_DIR", dataDir);

    try {
      await writeScanCursor("first-sha");
      await writeScanCursor("second-sha");

      expect((await readScanCursor())?.lastScannedSha).toBe("second-sha");
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });
});
