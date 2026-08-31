import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const created: string[] = [];

export function tempDir(name?: string): string {
  const parent = mkdtempSync(join(tmpdir(), "moth-test-"));
  created.push(parent);
  if (name === undefined) return parent;
  const dir = join(parent, name);
  mkdirSync(dir);
  return dir;
}

export function cleanupTempDirs(): void {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
}
