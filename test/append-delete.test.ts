import { afterAll, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { run } from "../src/run.ts";
import { captureIo } from "./helpers/capture-io.ts";
import { parseFrontmatter } from "./helpers/frontmatter.ts";
import { initedRepo } from "./helpers/repo-fixture.ts";
import { cleanupTempDirs } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

const file = (dir: string) => join(dir, ".moth", "001-fix-the-redirect.md");

async function repoWithTicket(body?: string): Promise<string> {
  const dir = await initedRepo();
  const args = body === undefined ? [] : ["--body", body];
  await run(["new", "Fix the redirect", ...args], captureIo(dir));
  return dir;
}

test("piped text is appended under a notes heading, leaving the rest untouched", async () => {
  const dir = await repoWithTicket("The original description.");
  const io = captureIo(dir, { stdin: "Reproduced on Safari." });

  const code = await run(["append", "1"], io);

  expect(code).toBe(0);
  const parsed = parseFrontmatter(readFileSync(file(dir), "utf8"));
  expect(parsed.data.title).toBe("Fix the redirect");
  expect(parsed.body).toContain("The original description.");
  expect(parsed.body).toContain("## Notes");
  expect(parsed.body).toContain("Reproduced on Safari.");
});

test("appending twice accumulates rather than replaces", async () => {
  const dir = await repoWithTicket("Original.");

  await run(["append", "1"], captureIo(dir, { stdin: "First note." }));
  await run(["append", "1"], captureIo(dir, { stdin: "Second note." }));

  const body = parseFrontmatter(readFileSync(file(dir), "utf8")).body;
  expect(body).toContain("First note.");
  expect(body).toContain("Second note.");
  expect(body.match(/## Notes/g)).toHaveLength(1);
});

test("multi-line markdown survives an append unaltered", async () => {
  const dir = await repoWithTicket("Original.");
  const note = [
    "A fenced block:",
    "",
    "```ts",
    "const a = 1;",
    "```",
    "",
    'and a quote: "x".',
  ].join("\n");

  await run(["append", "1"], captureIo(dir, { stdin: note }));

  expect(parseFrontmatter(readFileSync(file(dir), "utf8")).body).toContain(note);
});

test("delete removes the ticket file when confirmed", async () => {
  const dir = await repoWithTicket();

  const code = await run(["delete", "1", "--yes"], captureIo(dir));

  expect(code).toBe(0);
  expect(readdirSync(join(dir, ".moth"))).toEqual([]);
});

test("delete without confirmation refuses, does not prompt, and keeps the file", async () => {
  const dir = await repoWithTicket();
  const io = captureIo(dir);

  const code = await run(["delete", "1"], io);

  expect(code).toBe(2);
  expect(io.asked()).toEqual([]);
  expect(existsSync(file(dir))).toBe(true);
});

test("delete's help points at cancelling as the normal path", async () => {
  const dir = await repoWithTicket();
  const io = captureIo(dir);

  const code = await run(["delete", "--help"], io);

  expect(code).toBe(0);
  expect(io.out().toLowerCase()).toContain("cancel");
});
