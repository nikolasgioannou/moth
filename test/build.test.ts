import { expect, test } from "bun:test";
import { readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildBinary, REPO_ROOT } from "../scripts/build.ts";

function tempArtifacts(): string[] {
  return readdirSync(REPO_ROOT).filter((name) => name.endsWith(".bun-build"));
}

test("building leaves no temp artifacts in the repo root", () => {
  const before = tempArtifacts();

  buildBinary();

  expect(tempArtifacts()).toEqual(before);
});

test("a failed build also leaves nothing behind", () => {
  const before = tempArtifacts();
  const broken = join(tmpdir(), "moth-broken-entry.ts");
  writeFileSync(broken, "const : : = !!! not typescript");

  expect(() => buildBinary(broken, join(tmpdir(), "moth-broken-out"))).toThrow();

  expect(tempArtifacts()).toEqual(before);
});

test("repeated builds do not accumulate artifacts", () => {
  const before = tempArtifacts();

  buildBinary();
  buildBinary();

  expect(tempArtifacts()).toEqual(before);
});

test("a build leaves the tracked tree untouched", () => {
  const status = () =>
    Bun.spawnSync(["git", "status", "--porcelain"], { cwd: REPO_ROOT }).stdout.toString();
  const before = status();

  buildBinary();

  expect(status()).toBe(before);
});
