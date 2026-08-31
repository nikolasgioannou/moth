import { afterAll, expect, test } from "bun:test";
import { readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { run } from "../src/run.ts";
import { captureIo } from "./helpers/capture-io.ts";
import { initedRepo } from "./helpers/repo-fixture.ts";
import { newTicket, ticketPath, ticketText } from "./helpers/tickets.ts";
import { cleanupTempDirs } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

const files = (dir: string) => readdirSync(join(dir, ".moth")).sort();

async function check(dir: string, ...args: string[]) {
  const io = captureIo(dir);
  const code = await run(["check", ...args], io);
  return { code, output: io.out() + io.err() };
}

test("check passes a clean store", async () => {
  const dir = await initedRepo();
  await newTicket(dir, "Fix the redirect");

  expect((await check(dir)).code).toBe(0);
});

test("check reports a filename whose slug no longer matches its title, and --fix renames it", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix the redirect");
  renameSync(ticketPath(dir, id), join(dir, ".moth", `${id}-stale-name.md`));

  const reported = await check(dir);
  expect(reported.code).not.toBe(0);
  expect(reported.output).toContain("stale-name.md");

  const fixed = await check(dir, "--fix");
  expect(fixed.code).toBe(0);
  expect(files(dir)).toEqual([`${id}-fix-the-redirect.md`]);
});

test("check reports dangling blocking references", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix the redirect");
  const path = ticketPath(dir, id);
  writeFileSync(
    path,
    readFileSync(path, "utf8").replace("labels: []", "labels: []\nblocked_by:\n  - deadbe"),
  );

  const result = await check(dir);

  expect(result.code).not.toBe(0);
  expect(result.output).toContain("deadbe");
});

test("check reports two tickets sharing an id, and --fix reissues one", async () => {
  const dir = await initedRepo();
  const clashing = await newTicket(dir, "Alpha", [], { randomHex: () => "aaaaaa" });
  const copy = ticketText(dir, clashing)
    .replace("title: Alpha", "title: Beta")
    .replace(/created_at: .*/, "created_at: 2030-01-01T00:00:00.000Z");
  writeFileSync(join(dir, ".moth", `${clashing}-beta.md`), copy);

  const reported = await check(dir);
  expect(reported.code).not.toBe(0);
  expect(reported.output).toContain(clashing);

  const fixed = await check(dir, "--fix");
  expect(fixed.code).toBe(0);
  const ids = files(dir).map((name) => name.slice(0, 6));
  expect(new Set(ids).size).toBe(ids.length);
  // Alpha was created first, so it keeps the id it already had
  expect(files(dir)).toContain(`${clashing}-alpha.md`);
});

test("check reports nesting deeper than one level", async () => {
  const dir = await initedRepo();
  const top = await newTicket(dir, "Parent");
  const middle = await newTicket(dir, "Child");
  const bottom = await newTicket(dir, "Grandchild");
  await run(["edit", middle, "--parent", top], captureIo(dir));
  const path = ticketPath(dir, bottom);
  writeFileSync(
    path,
    readFileSync(path, "utf8").replace("labels: []", `labels: []\nparent: "${middle}"`),
  );

  const result = await check(dir);

  expect(result.code).not.toBe(0);
  expect(result.output.toLowerCase()).toContain("one level");
});

test("check reports undeclared fields and unknown statuses", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix the redirect");
  const path = ticketPath(dir, id);
  writeFileSync(
    path,
    readFileSync(path, "utf8")
      .replace("status: backlog", "status: shipped")
      .replace("labels: []", "labels: []\nseverity: high"),
  );

  const result = await check(dir);

  expect(result.code).not.toBe(0);
  expect(result.output).toContain("severity");
  expect(result.output).toContain("shipped");
});

test("check is reachable as doctor", async () => {
  const dir = await initedRepo();
  await newTicket(dir, "Fix the redirect");

  expect(await run(["doctor"], captureIo(dir))).toBe(0);
});

test("--fix says what it left alone", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix the redirect");
  const path = ticketPath(dir, id);
  writeFileSync(path, readFileSync(path, "utf8").replace("status: backlog", "status: shipped"));

  const result = await check(dir, "--fix");

  expect(result.code).not.toBe(0);
  expect(result.output.toLowerCase()).toContain("shipped");
});
