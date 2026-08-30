import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const REPO_ROOT = join(import.meta.dir, "..");
export const ENTRY = join(REPO_ROOT, "src", "cli.ts");
export const BINARY = join(REPO_ROOT, "dist", "moth");

/**
 * Compiles the CLI to a single binary. Throws if the build fails.
 *
 * `bun build --compile` copies the Bun runtime to a temp file in the working
 * directory and never removes it, so the build runs from a scratch directory
 * that is deleted afterwards, including when the build throws.
 */
export function buildBinary(entry: string = ENTRY, outfile: string = BINARY): void {
  const scratch = mkdtempSync(join(tmpdir(), "moth-build-"));
  try {
    const result = Bun.spawnSync(["bun", "build", "--compile", entry, "--outfile", outfile], {
      cwd: scratch,
    });
    if (result.exitCode !== 0) {
      throw new Error(`build failed:\n${result.stderr.toString()}`);
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  buildBinary();
}
