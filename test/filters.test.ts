import { afterAll, beforeAll, expect, test } from "bun:test";
import { run } from "../src/run.ts";
import { captureIo } from "./helpers/capture-io.ts";
import { initedRepo } from "./helpers/repo-fixture.ts";
import { givenTicket } from "./helpers/tickets.ts";
import { cleanupTempDirs } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

let dir = "";

beforeAll(async () => {
  dir = await initedRepo();
  await givenTicket(dir, { title: "Write the parser", status: "in-progress" });
  await givenTicket(dir, { title: "Ship the binary" });
  await run(["new", "Fix the redirect loop", "--body", "caused by a stale cookie"], captureIo(dir));
  await run(["move", "3", "done"], captureIo(dir));
  await run(["edit", "1", "--priority", "high", "--label", "cli"], captureIo(dir));
  await run(["edit", "2", "--label", "cli", "--label", "docs"], captureIo(dir));
});

async function ids(...args: string[]): Promise<number[]> {
  const io = captureIo(dir);
  await run(["list", "--json", ...args], io);
  return (JSON.parse(io.out()) as { id: number }[]).map((ticket) => ticket.id).sort();
}

test("filtering by status narrows to that status", async () => {
  expect(await ids("--status", "in-progress")).toEqual([1]);
});

test("filtering by category works without knowing the repo's status names", async () => {
  expect(await ids("--category", "started")).toEqual([1]);
  expect(await ids("--category", "backlog")).toEqual([2]);
});

test("filtering by priority narrows to that priority", async () => {
  expect(await ids("--priority", "high")).toEqual([1]);
});

test("filtering by label narrows to tickets carrying it", async () => {
  expect(await ids("--label", "cli")).toEqual([1, 2]);
  expect(await ids("--label", "docs")).toEqual([2]);
});

test("filters combine and narrow cumulatively", async () => {
  expect(await ids("--label", "cli", "--priority", "high")).toEqual([1]);
  expect(await ids("--label", "cli", "--category", "backlog")).toEqual([2]);
});

test("search matches titles and bodies", async () => {
  expect(await ids("--search", "parser")).toEqual([1]);
  expect(await ids("--search", "stale cookie")).toEqual([3]);
});

test("a filter matching nothing is an empty result, not an error", async () => {
  const io = captureIo(dir);

  const code = await run(["list", "--json", "--label", "nonexistent"], io);

  expect(code).toBe(0);
  expect(JSON.parse(io.out())).toEqual([]);
});
