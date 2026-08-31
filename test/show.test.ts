import { afterAll, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { run } from "../src/run.ts";
import { captureIo } from "./helpers/capture-io.ts";
import { initedRepo } from "./helpers/repo-fixture.ts";
import { newTicket } from "./helpers/tickets.ts";
import { cleanupTempDirs } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

test("show renders a ticket's metadata and body", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix the login redirect", [
    "--body",
    "It loops on a stale cookie.",
  ]);
  const io = captureIo(dir);

  const code = await run(["show", id], io);

  expect(code).toBe(0);
  expect(io.out()).toContain(id);
  expect(io.out()).toContain("Fix the login redirect");
  expect(io.out()).toContain("backlog");
  expect(io.out()).toContain("It loops on a stale cookie.");
});

test("an id resolves in full or by an unambiguous leading fragment", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix the login redirect");

  for (const reference of [id, id.slice(0, 3)]) {
    const io = captureIo(dir);
    expect(await run(["show", reference], io)).toBe(0);
    expect(io.out()).toContain("Fix the login redirect");
  }
});

test("a ticket resolves by words from its title", async () => {
  const dir = await initedRepo();
  await newTicket(dir, "Fix the login redirect");
  const io = captureIo(dir);

  expect(await run(["show", "login redirect"], io)).toBe(0);
  expect(io.out()).toContain("Fix the login redirect");
});

test("an id wins over a title that happens to contain the same characters", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Parse the frontmatter", [], { randomHex: () => "abcdef" });
  await newTicket(dir, `A ticket mentioning ${id} in its title`);
  const io = captureIo(dir);

  expect(await run(["show", id], io)).toBe(0);
  expect(io.out()).toContain("Parse the frontmatter");
});

test("an ambiguous reference lists the candidates instead of guessing", async () => {
  const dir = await initedRepo();
  const first = await newTicket(dir, "Fix the login redirect");
  const second = await newTicket(dir, "Fix the login form");
  const io = captureIo(dir);

  const code = await run(["show", "Fix the login"], io);

  expect(code).not.toBe(0);
  expect(io.err()).toContain(first);
  expect(io.err()).toContain(second);
  expect(io.out()).toBe("");
});

test("a reference matching nothing says so, distinctly from an ambiguous one", async () => {
  const dir = await initedRepo();
  await newTicket(dir, "Fix the login redirect");
  const io = captureIo(dir);

  const code = await run(["show", "nothing like this"], io);

  expect(code).not.toBe(0);
  expect(io.err().toLowerCase()).toContain("no ticket");
  expect(io.err().toLowerCase()).not.toContain("ambiguous");
});

test("two tickets sharing an id are an ambiguous reference", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Alpha", [], { randomHex: () => "aaaaaa" });
  const front = (title: string) =>
    `---\nid: ${id}\ntitle: ${title}\nstatus: backlog\npriority: none\nlabels: []\n---\n\n`;
  writeFileSync(join(dir, ".moth", `${id}-beta.md`), front("Beta"));
  const io = captureIo(dir);

  const code = await run(["show", id], io);

  expect(code).not.toBe(0);
  expect(io.err().toLowerCase()).toContain("ambiguous");
  expect(io.err()).toContain("Beta");
});

test("show emits the ticket as json, body included", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix the login redirect", [
    "--body",
    "It loops on a stale cookie.",
  ]);
  const io = captureIo(dir);

  expect(await run(["show", id, "--json"], io)).toBe(0);
  expect(JSON.parse(io.out())).toMatchObject({
    id,
    title: "Fix the login redirect",
    status: "backlog",
    body: "It loops on a stale cookie.\n",
  });
});

test("show renders a ticket's labels", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix the login redirect");
  await run(["edit", id, "--label", "cli", "--label", "auth"], captureIo(dir));
  const io = captureIo(dir);

  await run(["show", id], io);

  expect(io.out()).toContain("auth");
  expect(io.out()).toContain("cli");
});
