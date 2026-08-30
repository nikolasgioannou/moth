import { test, expect, beforeAll } from "bun:test";

const BINARY = "dist/moth";

beforeAll(async () => {
  const build = Bun.spawnSync([
    "bun", "build", "--compile", "src/cli.ts", "--outfile", BINARY,
  ]);
  if (build.exitCode !== 0) {
    throw new Error(`build failed:\n${build.stderr.toString()}`);
  }
});

test("the compiled binary reports the version", () => {
  const proc = Bun.spawnSync([BINARY, "--version"]);

  expect(proc.exitCode).toBe(0);
  expect(proc.stdout.toString()).toBe("0.1.0\n");
});

test("the compiled binary propagates a usage failure to the shell", () => {
  const proc = Bun.spawnSync([BINARY, "frobnicate"]);

  expect(proc.exitCode).toBe(2);
  expect(proc.stderr.toString()).toContain("frobnicate");
  expect(proc.stdout.toString()).toBe("");
});
