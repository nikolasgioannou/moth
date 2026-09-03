import { expect, test } from "bun:test";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildBinary, REPO_ROOT } from "../scripts/build.ts";

// Every test here shells out to `bun build --compile`. On a machine that has not
// compiled before, the first call downloads the Bun runtime — measured at 6.4s
// in CI against 75ms locally, where it is cached. That is what the 5s default
// timeout was failing, so these get room the compiler's own variance needs.
const BUILD_TIMEOUT = 120_000;

// Its own output path, not the default `dist/moth` that binary.test.ts builds
// and runs. Nothing here cares where the binary lands — these tests are about
// what a build leaves behind — and sharing the path made two files depend on
// Bun running them one at a time.
const outfile = () => join(mkdtempSync(join(tmpdir(), "moth-build-test-")), "moth");

function tempArtifacts(): string[] {
  return readdirSync(REPO_ROOT).filter((name) => name.endsWith(".bun-build"));
}

test(
  "building leaves no temp artifacts in the repo root",
  () => {
    const before = tempArtifacts();

    buildBinary(undefined, outfile());

    expect(tempArtifacts()).toEqual(before);
  },
  BUILD_TIMEOUT,
);

test(
  "a failed build also leaves nothing behind",
  () => {
    const before = tempArtifacts();
    const broken = join(tmpdir(), "moth-broken-entry.ts");
    writeFileSync(broken, "const : : = !!! not typescript");

    expect(() => buildBinary(broken, join(tmpdir(), "moth-broken-out"))).toThrow();

    expect(tempArtifacts()).toEqual(before);
  },
  BUILD_TIMEOUT,
);

test(
  "repeated builds do not accumulate artifacts",
  () => {
    const before = tempArtifacts();

    buildBinary(undefined, outfile());
    buildBinary(undefined, outfile());

    expect(tempArtifacts()).toEqual(before);
  },
  BUILD_TIMEOUT,
);

test(
  "a build leaves the tracked tree untouched",
  () => {
    const status = () =>
      Bun.spawnSync(["git", "status", "--porcelain"], { cwd: REPO_ROOT }).stdout.toString();
    const before = status();

    buildBinary(undefined, outfile());

    expect(status()).toBe(before);
  },
  BUILD_TIMEOUT,
);
