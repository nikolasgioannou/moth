import { afterAll, expect, test } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { run } from "../src/run.ts";
import { captureIo } from "./helpers/capture-io.ts";
import { initedRepo } from "./helpers/repo-fixture.ts";
import { newTicket, ticketPath } from "./helpers/tickets.ts";
import { cleanupTempDirs } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

async function repoWithTicket(body?: string): Promise<[string, string]> {
  const dir = await initedRepo();
  const args = body === undefined ? [] : ["--body", body];
  return [dir, await newTicket(dir, "Fix the redirect", args)];
}

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
