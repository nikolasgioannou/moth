import { afterAll, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "../test/frontmatter.ts";
import { captureIo } from "../test/io.ts";
import { initedRepo } from "../test/repo.ts";
import { cleanupTempDirs } from "../test/tmp.ts";
import { run } from "./run.ts";

afterAll(cleanupTempDirs);

const ticketFile = (dir: string, name: string) =>
  readFileSync(join(dir, ".moth", "tickets", name), "utf8");

test("move puts a ticket in a status the repo defined", async () => {
  const dir = await initedRepo();
  await run(["new", "Fix the login redirect", "--body", "Stale cookie."], captureIo(dir));
  const io = captureIo(dir);

  const code = await run(["move", "1", "in-progress"], io);

  expect(code).toBe(0);
  const parsed = parseFrontmatter(ticketFile(dir, "001-fix-the-login-redirect.md"));
  expect(parsed.data.status).toBe("in-progress");
  expect(parsed.body).toBe("Stale cookie.\n");
});

test("moving to a status the repo has not defined fails and lists the legal ones", async () => {
  const dir = await initedRepo();
  await run(["new", "Fix the login redirect"], captureIo(dir));
  const io = captureIo(dir);

  const code = await run(["move", "1", "shipped"], io);

  expect(code).toBe(1);
  expect(io.err()).toContain("shipped");
  expect(io.err()).toContain("in-progress");
  const parsed = parseFrontmatter(ticketFile(dir, "001-fix-the-login-redirect.md"));
  expect(parsed.data.status).toBe("backlog");
});

test("moving a ticket to the status it already holds changes nothing and succeeds", async () => {
  const dir = await initedRepo();
  await run(["new", "Fix the login redirect"], captureIo(dir));
  const before = ticketFile(dir, "001-fix-the-login-redirect.md");
  const io = captureIo(dir, { now: () => new Date("2030-01-01T00:00:00.000Z") });

  const code = await run(["move", "1", "backlog"], io);

  expect(code).toBe(0);
  expect(io.err()).toBe("");
  expect(ticketFile(dir, "001-fix-the-login-redirect.md")).toBe(before);
});

test("move prints the ticket it updated", async () => {
  const dir = await initedRepo();
  await run(["new", "Fix the login redirect"], captureIo(dir));
  const io = captureIo(dir);

  await run(["move", "1", "in-progress"], io);

  expect(io.out()).toContain("001");
  expect(io.out()).toContain("Fix the login redirect");
  expect(io.out()).toContain("in-progress");
});

test("a move touches the updated timestamp and not the created one", async () => {
  const dir = await initedRepo();
  const created = "2026-01-01T00:00:00.000Z";
  await run(["new", "Fix the login redirect"], captureIo(dir, { now: () => new Date(created) }));
  const moved = "2026-06-15T12:00:00.000Z";

  await run(["move", "1", "in-progress"], captureIo(dir, { now: () => new Date(moved) }));

  const data = parseFrontmatter(ticketFile(dir, "001-fix-the-login-redirect.md")).data;
  expect(data.created_at).toBe(created);
  expect(data.updated_at).toBe(moved);
});

test("a ticket can move into a status from each of the six categories", async () => {
  const dir = await initedRepo();
  await run(["new", "Fix the login redirect"], captureIo(dir));

  for (const status of ["backlog", "todo", "in-progress", "done", "canceled", "duplicate"]) {
    const io = captureIo(dir);

    expect(await run(["move", "1", status], io)).toBe(0);

    const listed = captureIo(dir);
    await run(["list"], listed);
    const headings = listed
      .out()
      .split("\n")
      .filter((line) => line !== "" && !line.startsWith(" "));
    expect(headings).toEqual([status]);
  }
});
