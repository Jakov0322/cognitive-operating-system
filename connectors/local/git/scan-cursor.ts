import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { getDataRoot } from "../../../core/shared/workspace";

export type ScanCursor = {
  lastScannedSha: string;
  scannedAt: string;
};

function cursorPath(): string {
  return join(getDataRoot(), "knowledge", "state", "git-scan-cursor.json");
}

export async function readScanCursor(): Promise<ScanCursor | null> {
  try {
    const raw = await readFile(cursorPath(), "utf8");
    return JSON.parse(raw) as ScanCursor;
  } catch {
    return null;
  }
}

export async function writeScanCursor(lastScannedSha: string): Promise<void> {
  const cursor: ScanCursor = {
    lastScannedSha,
    scannedAt: new Date().toISOString(),
  };

  await mkdir(join(getDataRoot(), "knowledge", "state"), { recursive: true });
  await writeFile(cursorPath(), JSON.stringify(cursor, null, 2), "utf8");
}
