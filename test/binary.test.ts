import { afterAll, beforeAll, expect, test } from "bun:test";
import { BINARY, buildBinary } from "../scripts/build.ts";
import { cleanupTempDirs, tempDir } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

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

test("the compiled binary serves moth open until interrupted", async () => {
  const dir = tempDir();
  Bun.spawnSync([BINARY, "init"], { cwd: dir, stdin: "ignore" });
  const proc = Bun.spawn([BINARY, "open", "--no-open", "--port", "0"], {
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  });

  const reader = proc.stdout.getReader();
  let printed = "";
  while (!printed.includes("\n")) {
    const { value, done } = await reader.read();
    if (done) break;
    printed += new TextDecoder().decode(value);
  }
  const response = await fetch(`${printed.trim()}/`);
  expect(response.status).toBe(200);
  expect(await response.text()).toContain("<title>moth</title>");

  proc.kill("SIGINT");
  expect(await proc.exited).toBe(0);
}, 30_000);
