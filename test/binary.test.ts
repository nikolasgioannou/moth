import { beforeAll, expect, test } from "bun:test";
import { BINARY, buildBinary } from "../scripts/build.ts";

beforeAll(() => {
  buildBinary();
});

test("the compiled binary reports the version", () => {
  const proc = Bun.spawnSync([BINARY, "--version"]);

  expect(proc.exitCode).toBe(0);
  expect(proc.stdout.toString()).toMatch(/^\d+\.\d+\.\d+\n$/);
});

test("the compiled binary propagates a usage failure to the shell", () => {
  const proc = Bun.spawnSync([BINARY, "frobnicate"]);

  expect(proc.exitCode).toBe(2);
  expect(proc.stderr.toString()).toContain("frobnicate");
  expect(proc.stdout.toString()).toBe("");
});
