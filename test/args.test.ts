import { afterAll, expect, test } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { run } from "../src/run.ts";
import { captureIo } from "./helpers/capture-io.ts";
import { initedRepo } from "./helpers/repo-fixture.ts";
import { cleanupTempDirs, tempDir } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

test("a flag is recognised before the positional argument", async () => {
  const dir = await initedRepo();
  const io = captureIo(dir);

  const code = await run(["new", "--json", "Fix the login redirect"], io);

  expect(code).toBe(0);
  expect(JSON.parse(io.out()).title).toBe("Fix the login redirect");
});

test("a flag value may be given with an equals sign", async () => {
  const dir = await initedRepo();
  const io = captureIo(dir);

  await run(["new", "Fix login", "--body=Some details.", "--json"], io);

  expect(JSON.parse(io.out()).body).toBe("Some details.");
});

test("a boolean flag does not consume the argument after it", async () => {
  const dir = await initedRepo();
  const io = captureIo(dir);

  await run(["new", "--json", "--body", "Details.", "Fix login"], io);

  const ticket = JSON.parse(io.out());
  expect(ticket.title).toBe("Fix login");
  expect(ticket.body).toBe("Details.");
});

test("an unrecognised flag is a usage error and writes nothing", async () => {
  const dir = await initedRepo();
  const io = captureIo(dir);

  const code = await run(["new", "Fix login", "--jsn"], io);

  expect(code).toBe(2);
  expect(io.err()).toContain("jsn");
  expect(io.out()).toBe("");
  expect(readdirSync(join(dir, ".moth"))).toHaveLength(0);
});

test("a title beginning with a hyphen can be passed after a separator", async () => {
  const dir = await initedRepo();
  const io = captureIo(dir);

  const code = await run(["new", "--json", "--", "-fix the parser"], io);

  expect(code).toBe(0);
  expect(JSON.parse(io.out()).title).toBe("-fix the parser");
});

test("a flag missing its value is a usage error", async () => {
  const dir = await initedRepo();
  const io = captureIo(dir);

  const code = await run(["new", "Fix login", "--body"], io);

  expect(code).toBe(2);
  expect(readdirSync(join(dir, ".moth"))).toHaveLength(0);
});

test("an unrecognised flag is rejected by every command, not just new", async () => {
  const dir = tempDir();
  const io = captureIo(dir, { answers: [] });

  const code = await run(["init", "--jsn"], io);

  expect(code).toBe(2);
  expect(io.err()).toContain("jsn");
  expect(existsSync(join(dir, "moth.config.yml"))).toBe(false);
});
