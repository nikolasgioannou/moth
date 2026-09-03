import { beforeAll, expect, test } from "bun:test";
import { BINARY, buildBinary } from "../scripts/build.ts";

beforeAll(() => {
  buildBinary();
});

// beforeAll compiles the binary and Bun charges that time to the first test.
// On a machine that has not compiled before, that call downloads the Bun runtime:
// 6.4s in CI against 75ms locally, where it is cached. Hence the room.
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
