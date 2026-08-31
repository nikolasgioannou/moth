import { expect, test } from "bun:test";
import { run } from "../src/run.ts";
import { captureIo } from "./helpers/capture-io.ts";

test("--version reports the version and succeeds", async () => {
  const io = captureIo(process.cwd());

  const code = await run(["--version"], io);

  expect(code).toBe(0);
  // The shape, not the number: a literal here would fail on every release, since
  // the version is bumped after the tests run and before the tag is pushed.
  expect(io.out()).toMatch(/^\d+\.\d+\.\d+\n$/);
});

test("an unrecognised command is rejected on stderr, leaving stdout clean", async () => {
  const io = captureIo(process.cwd());

  const code = await run(["frobnicate"], io);

  expect(code).toBe(2);
  expect(io.err()).toContain("frobnicate");
  expect(io.out()).toBe("");
});
