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
  expect(existsSync(join(dir, ".moth", "config.yml"))).toBe(true);
  expect(existsSync(join(dir, ".moth", "tickets"))).toBe(true);
});

test("init records the ticket prefix you choose", async () => {
  const dir = tempDir();
  const io = captureIo(dir, { answers: ["ENG"] });

  await run(["init"], io);

  const config = Bun.YAML.parse(readFileSync(join(dir, ".moth", "config.yml"), "utf8")) as {
    prefix?: string;
  };
  expect(config.prefix).toBe("ENG");
});

test("init offers a ticket prefix derived from the directory name", async () => {
  const dir = tempDir("my-project");
  const io = captureIo(dir, { answers: [] });

  await run(["init"], io);

  const asked = io.asked().find((entry) => /prefix/i.test(entry.question));
  expect(asked?.defaultValue).toBe("MYPROJECT");
});

test("init records a default status for each of the six categories", async () => {
  const dir = tempDir();
  const io = captureIo(dir, { answers: [] });

  await run(["init"], io);

  const config = Bun.YAML.parse(readFileSync(join(dir, ".moth", "config.yml"), "utf8")) as {
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
    answers: ["ENG", "", "", "in-progress, in-review", "", "", ""],
  });

  await run(["init"], io);

  const config = Bun.YAML.parse(readFileSync(join(dir, ".moth", "config.yml"), "utf8")) as {
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
  const configPath = join(dir, ".moth", "config.yml");
  await run(["init"], captureIo(dir, { answers: ["ENG"] }));
  const before = readFileSync(configPath, "utf8");

  const io = captureIo(dir, { answers: ["SOMETHINGELSE"] });
  const code = await run(["init"], io);

  expect(code).toBe(0);
  expect(readFileSync(configPath, "utf8")).toBe(before);
  expect(io.asked()).toEqual([]);
});

test("init writes a config you can hand-edit", async () => {
  const dir = tempDir();
  const io = captureIo(dir, { answers: ["ENG"] });

  await run(["init"], io);

  const raw = readFileSync(join(dir, ".moth", "config.yml"), "utf8");
  expect(raw).toContain("\nstatuses:\n");
  expect(raw).not.toContain("{prefix");
  expect(Bun.YAML.parse(raw)).toMatchObject({ prefix: "ENG" });
});
