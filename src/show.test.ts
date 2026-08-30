import { afterAll, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { captureIo } from "../test/io.ts";
import { initedRepo } from "../test/repo.ts";
import { cleanupTempDirs } from "../test/tmp.ts";
import { run } from "./run.ts";

afterAll(cleanupTempDirs);

test("show renders a ticket's metadata and body", async () => {
  const dir = await initedRepo();
  await run(
    ["new", "Fix the login redirect", "--body", "It loops on a stale cookie."],
    captureIo(dir),
  );
  const io = captureIo(dir);

  const code = await run(["show", "1"], io);

  expect(code).toBe(0);
  const out = io.out();
  expect(out).toContain("001");
  expect(out).toContain("Fix the login redirect");
  expect(out).toContain("backlog");
  expect(out).toContain("It loops on a stale cookie.");
});

test("a number resolves with or without zero padding", async () => {
  const dir = await initedRepo();
  await run(["new", "Fix the login redirect"], captureIo(dir));

  for (const reference of ["1", "001"]) {
    const io = captureIo(dir);
    expect(await run(["show", reference], io)).toBe(0);
    expect(io.out()).toContain("Fix the login redirect");
  }
});

test("a number resolves when written with the repo's prefix", async () => {
  const dir = await initedRepo();
  await run(["new", "Fix the login redirect"], captureIo(dir));
  const configPath = join(dir, ".moth", "config.yml");
  writeFileSync(configPath, readFileSync(configPath, "utf8").replace('prefix: ""', "prefix: ENG"));

  const io = captureIo(dir);

  expect(await run(["show", "ENG-001"], io)).toBe(0);
  expect(io.out()).toContain("Fix the login redirect");
});

test("a ticket resolves by words from its title", async () => {
  const dir = await initedRepo();
  await run(["new", "Fix the login redirect"], captureIo(dir));
  const io = captureIo(dir);

  expect(await run(["show", "login redirect"], io)).toBe(0);
  expect(io.out()).toContain("Fix the login redirect");
});

test("a numeric reference is never matched against titles", async () => {
  const dir = await initedRepo();
  await run(["new", "20 things to fix"], captureIo(dir));
  const io = captureIo(dir);

  // ticket 20 does not exist; the only ticket is number 1, titled "20 things to fix"
  expect(await run(["show", "20"], io)).not.toBe(0);
  expect(io.out()).toBe("");
});

test("an ambiguous reference lists the candidates instead of guessing", async () => {
  const dir = await initedRepo();
  await run(["new", "Fix the login redirect"], captureIo(dir));
  await run(["new", "Fix the login form"], captureIo(dir));
  const io = captureIo(dir);

  const code = await run(["show", "Fix the login"], io);

  expect(code).not.toBe(0);
  expect(io.err()).toContain("001");
  expect(io.err()).toContain("002");
  expect(io.out()).toBe("");
});

test("a reference matching nothing says so, distinctly from an ambiguous one", async () => {
  const dir = await initedRepo();
  await run(["new", "Fix the login redirect"], captureIo(dir));
  const io = captureIo(dir);

  const code = await run(["show", "nothing like this"], io);

  expect(code).not.toBe(0);
  expect(io.err().toLowerCase()).toContain("no ticket");
  expect(io.err().toLowerCase()).not.toContain("ambiguous");
});

test("two tickets sharing a number are an ambiguous reference", async () => {
  const dir = await initedRepo();
  const tickets = join(dir, ".moth", "tickets");
  const front = (title: string) =>
    `---\nid: 1\ntitle: ${title}\nstatus: backlog\npriority: none\n---\n\n`;
  writeFileSync(join(tickets, "001-alpha.md"), front("Alpha"));
  writeFileSync(join(tickets, "001-beta.md"), front("Beta"));
  const io = captureIo(dir);

  const code = await run(["show", "1"], io);

  expect(code).not.toBe(0);
  expect(io.err().toLowerCase()).toContain("ambiguous");
  expect(io.err()).toContain("Alpha");
  expect(io.err()).toContain("Beta");
});

test("show emits the ticket as json, body included", async () => {
  const dir = await initedRepo();
  await run(
    ["new", "Fix the login redirect", "--body", "It loops on a stale cookie."],
    captureIo(dir),
  );
  const io = captureIo(dir);

  const code = await run(["show", "1", "--json"], io);

  expect(code).toBe(0);
  expect(JSON.parse(io.out())).toMatchObject({
    id: 1,
    title: "Fix the login redirect",
    status: "backlog",
    priority: "none",
    body: "It loops on a stale cookie.\n",
  });
});
