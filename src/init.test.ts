import { afterAll, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { captureIo } from "../test/io.ts";
import { cleanupTempDirs, tempDir } from "../test/tmp.ts";
import { run } from "./run.ts";

afterAll(cleanupTempDirs);

test("init creates a config and a ticket store", async () => {
  const dir = tempDir();
  const io = captureIo(dir, { answers: [] });

  const code = await run(["init"], io);

  expect(code).toBe(0);
  expect(existsSync(join(dir, "moth.config.yml"))).toBe(true);
  expect(existsSync(join(dir, "moth.config.yml"))).toBe(true);
});

test("init records a default status for each of the six categories", async () => {
  const dir = tempDir();
  const io = captureIo(dir, { answers: [] });

  await run(["init"], io);

  const config = Bun.YAML.parse(readFileSync(join(dir, "moth.config.yml"), "utf8")) as {
    statuses?: { name: string; category: string }[];
  };
  expect(config.statuses).toEqual([
    { name: "backlog", category: "backlog" },
    { name: "todo", category: "unstarted" },
    { name: "in-progress", category: "started" },
    { name: "done", category: "completed" },
    { name: "canceled", category: "canceled" },
    { name: "duplicate", category: "duplicate" },
  ]);
});

test("init accepts several statuses in one category", async () => {
  const dir = tempDir();
  const io = captureIo(dir, {
    answers: ["", "", "in-progress, in-review", "", "", ""],
  });

  await run(["init"], io);

  const config = Bun.YAML.parse(readFileSync(join(dir, "moth.config.yml"), "utf8")) as {
    statuses: { name: string; category: string }[];
  };
  const started = config.statuses.filter((s) => s.category === "started");
  expect(started).toEqual([
    { name: "in-progress", category: "started" },
    { name: "in-review", category: "started" },
  ]);
});

test("re-running init leaves an existing config untouched", async () => {
  const dir = tempDir();
  const configPath = join(dir, "moth.config.yml");
  await run(["init"], captureIo(dir, { answers: [] }));
  const before = readFileSync(configPath, "utf8");

  const io = captureIo(dir, { answers: ["different"] });
  const code = await run(["init"], io);

  expect(code).toBe(0);
  expect(readFileSync(configPath, "utf8")).toBe(before);
  expect(io.asked()).toEqual([]);
});

test("init writes a config you can hand-edit", async () => {
  const dir = tempDir();
  const io = captureIo(dir, { answers: [] });

  await run(["init"], io);

  const raw = readFileSync(join(dir, "moth.config.yml"), "utf8");
  expect(raw).toContain("\nstatuses:\n");
  expect(raw).not.toContain("{prefix");
  expect(Bun.YAML.parse(raw)).toMatchObject({ prefix: "" });
});

test("init does not ask for a ticket prefix", async () => {
  const dir = tempDir();
  const io = captureIo(dir, { answers: [] });

  await run(["init"], io);

  expect(io.asked().some((entry) => /prefix/i.test(entry.question))).toBe(false);
});
