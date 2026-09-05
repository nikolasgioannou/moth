import { afterAll, expect, test } from "bun:test";
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildBinary, REPO_ROOT } from "../scripts/build.ts";
import { cleanupTempDirs, tempDir } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

// Every test here shells out to `bun build --compile`. On a machine that has not
// compiled before, the first call downloads the Bun runtime — measured at 6.4s
// in CI against 75ms locally, where it is cached. That is what the 5s default
// timeout was failing, so these get room the compiler's own variance needs.
const BUILD_TIMEOUT = 120_000;

function tempArtifacts(): string[] {
  return readdirSync(REPO_ROOT).filter((name) => name.endsWith(".bun-build"));
}

test(
  "building leaves no temp artifacts in the repo root and leaves the tree untouched",
  () => {
    const before = tempArtifacts();
    const status = () => {
      const result = Bun.spawnSync(["git", "status", "--porcelain"], { cwd: REPO_ROOT });
      expect(result.exitCode).toBe(0);
      return result.stdout.toString();
    };
    const treeBefore = status();

    // Keep the output separate from the binary smoke tests and remove it afterwards.
    buildBinary(undefined, join(tempDir(), "moth"));

    expect(tempArtifacts()).toEqual(before);
    expect(status()).toBe(treeBefore);
  },
  BUILD_TIMEOUT,
);

test(
  "a failed build also leaves nothing behind",
  () => {
    const before = tempArtifacts();
    const dir = tempDir();
    const broken = join(dir, "broken-entry.ts");
    writeFileSync(broken, "const : : = !!! not typescript");

    expect(() => buildBinary(broken, join(dir, "moth"))).toThrow();

    expect(tempArtifacts()).toEqual(before);
  },
  BUILD_TIMEOUT,
);
