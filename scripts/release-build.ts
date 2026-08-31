import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ENTRY, REPO_ROOT } from "./build.ts";

/** Every platform a release carries a binary for. */
export const TARGETS = [
  { target: "bun-darwin-arm64", asset: "moth-darwin-arm64" },
  { target: "bun-darwin-x64", asset: "moth-darwin-x64" },
  { target: "bun-linux-arm64", asset: "moth-linux-arm64" },
  { target: "bun-linux-x64", asset: "moth-linux-x64" },
  { target: "bun-windows-x64", asset: "moth-windows-x64.exe" },
] as const;

export const RELEASE_DIR = join(REPO_ROOT, "dist", "release");

/** A SHA256SUMS file the installer verifies a download against. */
function writeChecksums(assets: string[]): string {
  const lines = assets.map((asset) => {
    const digest = Bun.spawnSync(["shasum", "-a", "256", asset], { cwd: RELEASE_DIR });
    if (digest.exitCode !== 0) throw new Error(`checksumming ${asset} failed`);
    return digest.stdout.toString().trim();
  });
  const path = join(RELEASE_DIR, "SHA256SUMS");
  writeFileSync(path, `${lines.join("\n")}\n`);
  return path;
}

/**
 * Compiles a binary for every target. Like the ordinary build, each compile runs
 * from a scratch directory because `bun build --compile` abandons a copy of the
 * runtime in the working directory.
 */
export function buildAllTargets(): string[] {
  rmSync(RELEASE_DIR, { recursive: true, force: true });
  mkdirSync(RELEASE_DIR, { recursive: true });

  const built: string[] = [];
  for (const { target, asset } of TARGETS) {
    const scratch = mkdtempSync(join(tmpdir(), "moth-release-"));
    try {
      const outfile = join(RELEASE_DIR, asset);
      const result = Bun.spawnSync(
        ["bun", "build", "--compile", `--target=${target}`, ENTRY, "--outfile", outfile],
        { cwd: scratch },
      );
      if (result.exitCode !== 0) {
        throw new Error(`building ${target} failed:\n${result.stderr.toString()}`);
      }
      built.push(asset);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }
  writeChecksums(built);
  return built;
}

if (import.meta.main) {
  for (const asset of buildAllTargets()) console.log(`built ${asset}`);
  console.log("wrote SHA256SUMS");
}
