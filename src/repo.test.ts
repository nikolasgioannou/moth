import { afterAll, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { captureIo } from "../test/io.ts";
import { cleanupTempDirs, tempDir } from "../test/tmp.ts";
import { run } from "./run.ts";

afterAll(cleanupTempDirs);

test("init writes its config to moth.config.yml at the repo root", async () => {
  const dir = tempDir();

  await run(["init"], captureIo(dir, { answers: [] }));

  expect(existsSync(join(dir, "moth.config.yml"))).toBe(true);
});

test("the config names where tickets live, and init creates that directory", async () => {
  const dir = tempDir();
  await run(["init"], captureIo(dir, { answers: [] }));
  const path = join(dir, "moth.config.yml");
  writeFileSync(path, readFileSync(path, "utf8").replace(/^tickets: .*$/m, "tickets: issues"));
  mkdirSync(join(dir, "issues"));

  await run(["new", "Fix the redirect"], captureIo(dir));

  expect(existsSync(join(dir, "issues", "001-fix-the-redirect.md"))).toBe(true);
});

test("commands run from a subdirectory still find the repo root", async () => {
  const dir = tempDir();
  await run(["init"], captureIo(dir, { answers: [] }));
  await run(["new", "Fix the redirect"], captureIo(dir));
  const nested = join(dir, "src", "deeply", "nested");
  mkdirSync(nested, { recursive: true });
  const io = captureIo(nested);

  const code = await run(["list"], io);

  expect(code).toBe(0);
  expect(io.out()).toContain("Fix the redirect");
});

test("a config naming a directory that is missing says which one", async () => {
  const dir = tempDir();
  await run(["init"], captureIo(dir, { answers: [] }));
  const path = join(dir, "moth.config.yml");
  writeFileSync(path, readFileSync(path, "utf8").replace(/^tickets: .*$/m, "tickets: nowhere"));
  const io = captureIo(dir);

  const code = await run(["list"], io);

  expect(code).toBe(1);
  expect(io.err()).toContain("nowhere");
});
