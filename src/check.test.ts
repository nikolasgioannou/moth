import { afterAll, expect, test } from "bun:test";
import { readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { captureIo } from "../test/io.ts";
import { initedRepo } from "../test/repo.ts";
import { cleanupTempDirs } from "../test/tmp.ts";
import { run } from "./run.ts";

afterAll(cleanupTempDirs);

const tickets = (dir: string) => join(dir, ".moth");
const files = (dir: string) => readdirSync(tickets(dir)).sort();
const read = (dir: string, name: string) => readFileSync(join(tickets(dir), name), "utf8");

async function repoWith(...titles: string[]): Promise<string> {
  const dir = await initedRepo();
  for (const title of titles) await run(["new", title], captureIo(dir));
  return dir;
}

async function check(dir: string, ...args: string[]) {
  const io = captureIo(dir);
  const code = await run(["check", ...args], io);
  return { code, out: io.out(), err: io.err() };
}

test("check passes a clean store", async () => {
  const dir = await repoWith("Fix the redirect");

  const result = await check(dir);

  expect(result.code).toBe(0);
});

test("check reports a filename whose slug no longer matches its title, and --fix renames it", async () => {
  const dir = await repoWith("Fix the redirect");
  renameSync(
    join(tickets(dir), "001-fix-the-redirect.md"),
    join(tickets(dir), "001-stale-name.md"),
  );

  const reported = await check(dir);
  expect(reported.code).not.toBe(0);
  expect(reported.out + reported.err).toContain("001-stale-name.md");

  const fixed = await check(dir, "--fix");
  expect(fixed.code).toBe(0);
  expect(files(dir)).toEqual(["001-fix-the-redirect.md"]);
});

test("check reports dangling blocking references", async () => {
  const dir = await repoWith("Fix the redirect");
  const path = join(tickets(dir), "001-fix-the-redirect.md");
  writeFileSync(
    path,
    readFileSync(path, "utf8").replace("labels: []", "labels: []\nblocked_by:\n  - 99"),
  );

  const result = await check(dir);

  expect(result.code).not.toBe(0);
  expect(result.out + result.err).toContain("099");
});

test("check reports two tickets sharing a number, and --fix renumbers without breaking references", async () => {
  const dir = await repoWith("Alpha", "Gamma");
  // Gamma is blocked by Alpha; then a merge leaves a second ticket numbered 1.
  await run(["edit", "2", "--blocked-by", "1"], captureIo(dir));
  const clash = read(dir, "001-alpha.md")
    .replace("title: Alpha", "title: Beta")
    .replace(/created_at: .*/, "created_at: 2030-01-01T00:00:00.000Z");
  writeFileSync(join(tickets(dir), "001-beta.md"), clash);

  const reported = await check(dir);
  expect(reported.code).not.toBe(0);
  expect(reported.out + reported.err).toContain("001");

  const fixed = await check(dir, "--fix");
  expect(fixed.code).toBe(0);
  const numbers = files(dir).map((name) => name.slice(0, 3));
  expect(new Set(numbers).size).toBe(numbers.length);
  // Gamma still points at Alpha, not at whichever ticket took Alpha's old number
  const gamma = files(dir).find((name) => name.includes("gamma")) ?? "";
  const alphaNumber = Number((files(dir).find((name) => name.includes("alpha")) ?? "").slice(0, 3));
  expect(read(dir, gamma)).toContain(`- ${alphaNumber}`);
});

test("check reports nesting deeper than one level", async () => {
  const dir = await repoWith("Parent", "Child", "Grandchild");
  await run(["edit", "2", "--parent", "1"], captureIo(dir));
  const path = join(tickets(dir), "003-grandchild.md");
  writeFileSync(path, readFileSync(path, "utf8").replace("labels: []", "labels: []\nparent: 2"));

  const result = await check(dir);

  expect(result.code).not.toBe(0);
  expect((result.out + result.err).toLowerCase()).toContain("one level");
});

test("check reports undeclared fields and unknown statuses", async () => {
  const dir = await repoWith("Fix the redirect");
  const path = join(tickets(dir), "001-fix-the-redirect.md");
  writeFileSync(
    path,
    readFileSync(path, "utf8")
      .replace("status: backlog", "status: shipped")
      .replace("labels: []", "labels: []\nseverity: high"),
  );

  const result = await check(dir);

  expect(result.code).not.toBe(0);
  expect(result.out + result.err).toContain("severity");
  expect(result.out + result.err).toContain("shipped");
});

test("check is reachable as doctor", async () => {
  const dir = await repoWith("Fix the redirect");
  const io = captureIo(dir);

  expect(await run(["doctor"], io)).toBe(0);
});

test("--fix says what it left alone", async () => {
  const dir = await repoWith("Fix the redirect");
  const path = join(tickets(dir), "001-fix-the-redirect.md");
  writeFileSync(path, readFileSync(path, "utf8").replace("status: backlog", "status: shipped"));

  const result = await check(dir, "--fix");

  expect(result.code).not.toBe(0);
  expect((result.out + result.err).toLowerCase()).toContain("shipped");
});
