import { describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseFileArgs } from "./run-post-pr-risk-comment";

describe("parseFileArgs", () => {
  it("treats plain arguments as the file list", async () => {
    expect(await parseFileArgs(["core/a.ts", "core/b.ts"])).toEqual([
      "core/a.ts",
      "core/b.ts",
    ]);
  });

  it("filters out empty arguments", async () => {
    expect(await parseFileArgs(["core/a.ts", "", "core/b.ts"])).toEqual([
      "core/a.ts",
      "core/b.ts",
    ]);
  });

  it("reads newline-separated paths from --files-from, skipping blank lines", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cognitive-os-test-"));
    const filePath = join(dir, "changed-files.txt");
    await writeFile(filePath, "core/a.ts\n\ncore/b.ts\n", "utf8");

    try {
      expect(await parseFileArgs(["--files-from", filePath])).toEqual([
        "core/a.ts",
        "core/b.ts",
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("throws when --files-from is missing its path argument", async () => {
    await expect(parseFileArgs(["--files-from"])).rejects.toThrow(
      "--files-from requires a file path argument"
    );
  });
});
