import { afterAll, expect, test } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { run } from "../src/run.ts";
import { captureIo } from "./helpers/capture-io.ts";
import { parseFrontmatter } from "./helpers/frontmatter.ts";
import { initedRepo } from "./helpers/repo-fixture.ts";
import { newTicket, ticketPath, ticketText } from "./helpers/tickets.ts";
import { cleanupTempDirs } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

async function repoWithTicket(body?: string): Promise<[string, string]> {
  const dir = await initedRepo();
  const args = body === undefined ? [] : ["--body", body];
  return [dir, await newTicket(dir, "Fix the redirect", args)];
}

test("piped text is appended under a notes heading, leaving the rest untouched", async () => {
  const [dir, id] = await repoWithTicket("The original description.");
  const io = captureIo(dir, { stdin: "Reproduced on Safari." });

  const code = await run(["append", id], io);

  expect(code).toBe(0);
  const parsed = parseFrontmatter(ticketText(dir, id));
  expect(parsed.data.title).toBe("Fix the redirect");
  expect(parsed.body).toContain("The original description.");
  expect(parsed.body).toContain("## Notes");
  expect(parsed.body).toContain("Reproduced on Safari.");
});

test("appending twice accumulates rather than replaces", async () => {
  const [dir, id] = await repoWithTicket("Original.");

  await run(["append", id], captureIo(dir, { stdin: "First note." }));
  await run(["append", id], captureIo(dir, { stdin: "Second note." }));

  const body = parseFrontmatter(ticketText(dir, id)).body;
  expect(body).toContain("First note.");
  expect(body).toContain("Second note.");
  expect(body.match(/## Notes/g)).toHaveLength(1);
});

test("multi-line markdown survives an append unaltered", async () => {
  const [dir, id] = await repoWithTicket("Original.");
  const note = [
    "A fenced block:",
    "",
    "```ts",
    "const a = 1;",
    "```",
    "",
    'and a quote: "x".',
  ].join("\n");

  await run(["append", id], captureIo(dir, { stdin: note }));

  expect(parseFrontmatter(ticketText(dir, id)).body).toContain(note);
});

test("delete removes the ticket file when confirmed", async () => {
  const [dir, id] = await repoWithTicket();

  const code = await run(["delete", id, "--yes"], captureIo(dir));

  expect(code).toBe(0);
  expect(readdirSync(join(dir, ".moth"))).toEqual([]);
});

test("delete without confirmation refuses, does not prompt, and keeps the file", async () => {
  const [dir, id] = await repoWithTicket();
  const io = captureIo(dir);

  const code = await run(["delete", id], io);

  expect(code).toBe(2);
  expect(io.asked()).toEqual([]);
  expect(existsSync(ticketPath(dir, id))).toBe(true);
});

test("delete's help points at cancelling as the normal path", async () => {
  const [dir] = await repoWithTicket();
  const io = captureIo(dir);

  const code = await run(["delete", "--help"], io);

  expect(code).toBe(0);
  expect(io.out().toLowerCase()).toContain("cancel");
});
