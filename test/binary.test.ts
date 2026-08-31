import { beforeAll, expect, test } from "bun:test";
import { BINARY, buildBinary } from "../scripts/build.ts";

beforeAll(() => {
  buildBinary();
});

// beforeAll compiles the binary and Bun charges that time to the first test.
// A compile alongside the rest of the suite has been measured at over 6s
// against the 5s default, so this one test needs room the others do not.
test("the compiled binary reports the version", () => {
  const proc = Bun.spawnSync([BINARY, "--version"]);

  expect(proc.exitCode).toBe(0);
  expect(proc.stdout.toString()).toMatch(/^\d+\.\d+\.\d+\n$/);
}, 120_000);

test("the compiled binary propagates a usage failure to the shell", () => {
  const proc = Bun.spawnSync([BINARY, "frobnicate"]);

  expect(proc.exitCode).toBe(2);
  expect(proc.stderr.toString()).toContain("frobnicate");
  expect(proc.stdout.toString()).toBe("");
});
