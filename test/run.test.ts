import { expect, test } from "bun:test";
import { run } from "../src/run.ts";
import { captureIo } from "./capture-io.ts";

test("--version reports the version and succeeds", async () => {
  const io = captureIo(process.cwd());

  const code = await run(["--version"], io);

  expect(code).toBe(0);
  expect(io.out()).toBe("0.1.0\n");
});

test("an unrecognised command is rejected on stderr, leaving stdout clean", async () => {
  const io = captureIo(process.cwd());

  const code = await run(["frobnicate"], io);

  expect(code).toBe(2);
  expect(io.err()).toContain("frobnicate");
  expect(io.out()).toBe("");
});
