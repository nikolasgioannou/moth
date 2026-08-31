import { afterAll, beforeAll, expect, test } from "bun:test";
import { run } from "../src/run.ts";
import { captureIo } from "./helpers/capture-io.ts";
import { initedRepo } from "./helpers/repo-fixture.ts";
import { givenTicket, newTicket } from "./helpers/tickets.ts";
import { cleanupTempDirs } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

let dir = "";
let parser = "";
let binary = "";
let redirect = "";

beforeAll(async () => {
  dir = await initedRepo();
  parser = await givenTicket(dir, { title: "Write the parser", status: "in-progress" });
  binary = await givenTicket(dir, { title: "Ship the binary" });
  redirect = await newTicket(dir, "Fix the redirect loop", ["--body", "caused by a stale cookie"]);
  await run(["move", redirect, "done"], captureIo(dir));
  await run(["edit", parser, "--priority", "high", "--label", "cli"], captureIo(dir));
  await run(["edit", binary, "--label", "cli", "--label", "docs"], captureIo(dir));
});

async function ids(...args: string[]): Promise<string[]> {
  const io = captureIo(dir);
  await run(["list", "--json", ...args], io);
  return (JSON.parse(io.out()) as { id: string }[]).map((ticket) => ticket.id).sort();
}

test("filtering by status narrows to that status", async () => {
  expect(await ids("--status", "in-progress")).toEqual([parser]);
});

test("filtering by category works without knowing the repo's status names", async () => {
  expect(await ids("--category", "started")).toEqual([parser]);
  expect(await ids("--category", "backlog")).toEqual([binary]);
});

test("filtering by priority narrows to that priority", async () => {
  expect(await ids("--priority", "high")).toEqual([parser]);
});

test("filtering by label narrows to tickets carrying it", async () => {
  expect(await ids("--label", "cli")).toEqual([parser, binary].sort());
  expect(await ids("--label", "docs")).toEqual([binary]);
});

test("filters combine and narrow cumulatively", async () => {
  expect(await ids("--label", "cli", "--priority", "high")).toEqual([parser]);
  expect(await ids("--label", "cli", "--category", "backlog")).toEqual([binary]);
});

test("search matches titles and bodies", async () => {
  expect(await ids("--search", "parser")).toEqual([parser]);
  expect(await ids("--search", "stale cookie")).toEqual([redirect]);
});

test("a filter matching nothing is an empty result, not an error", async () => {
  const io = captureIo(dir);

  const code = await run(["list", "--json", "--label", "nonexistent"], io);

  expect(code).toBe(0);
  expect(JSON.parse(io.out())).toEqual([]);
});
