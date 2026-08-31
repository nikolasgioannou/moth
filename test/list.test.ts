import { afterAll, expect, test } from "bun:test";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { run } from "../src/run.ts";
import { captureIo } from "./capture-io.ts";
import { initedRepo } from "./repo-fixture.ts";
import { givenTicket } from "./tickets.ts";
import { cleanupTempDirs, tempDir } from "./tmp.ts";

afterAll(cleanupTempDirs);

test("list groups tickets under their status", async () => {
  const dir = await initedRepo();
  await givenTicket(dir, { title: "Write the parser", status: "in-progress" });
  await givenTicket(dir, { title: "Ship the binary" });
  const io = captureIo(dir);

  const code = await run(["list"], io);

  expect(code).toBe(0);
  const out = io.out();
  expect(out).toContain("backlog");
  expect(out).toContain("in-progress");
  expect(out).toContain("Write the parser");
  expect(out).toContain("Ship the binary");
  expect(out.indexOf("in-progress")).toBeLessThan(out.indexOf("Write the parser"));
});

test("listing an empty store says so and still succeeds", async () => {
  const dir = await initedRepo();
  const io = captureIo(dir);

  const code = await run(["list"], io);

  expect(code).toBe(0);
  expect(io.out().toLowerCase()).toContain("no tickets");
  expect(io.err()).toBe("");
});

test("columns stay aligned regardless of title length", async () => {
  const dir = await initedRepo();
  await givenTicket(dir, { title: "Short" });
  await givenTicket(dir, { title: "A considerably longer ticket title" });
  const io = captureIo(dir);

  await run(["list"], io);

  const rows = io
    .out()
    .split("\n")
    .filter((line) => /^\s+\d{3}\s/.test(line));
  expect(rows).toHaveLength(2);
  expect(rows.every((row) => row.includes("none"))).toBe(true);
  expect(new Set(rows.map((row) => row.indexOf("none"))).size).toBe(1);
});

test("list emits machine-readable json even on a terminal", async () => {
  const dir = await initedRepo();
  await givenTicket(dir, { title: "Write the parser", status: "in-progress" });
  await givenTicket(dir, { title: "Ship the binary" });
  const io = captureIo(dir, { isTty: true });

  const code = await run(["list", "--json"], io);

  expect(code).toBe(0);
  const tickets = JSON.parse(io.out()) as { id: number }[];
  expect(tickets.map((ticket) => ticket.id).sort()).toEqual([1, 2]);
  expect(tickets[0]).not.toHaveProperty("body");
  expect(io.out()).not.toContain(String.fromCharCode(27));
});

test("colour appears on a terminal and is absent when piped", async () => {
  const dir = await initedRepo();
  await givenTicket(dir, { title: "Write the parser" });
  const ansiEscape = String.fromCharCode(27);

  const terminal = captureIo(dir, { isTty: true });
  await run(["list"], terminal);
  const piped = captureIo(dir, { isTty: false });
  await run(["list"], piped);

  expect(terminal.out()).toContain(ansiEscape);
  expect(piped.out()).not.toContain(ansiEscape);
  expect(terminal.out()).toContain("Write the parser");
  expect(piped.out()).toContain("Write the parser");
});

test("list outside a moth repo reports on stderr and leaves stdout clean", async () => {
  const dir = tempDir();
  const io = captureIo(dir);

  const code = await run(["list"], io);

  expect(code).toBe(1);
  expect(io.err()).toContain("init");
  expect(io.out()).toBe("");
});

test("two tickets sharing a number are reported, and both still listed", async () => {
  const dir = await initedRepo();
  const tickets = join(dir, ".moth");
  const front = (title: string) =>
    `---\nid: 1\ntitle: ${title}\nstatus: backlog\npriority: none\n---\n\n`;
  writeFileSync(join(tickets, "001-alpha.md"), front("Alpha"));
  writeFileSync(join(tickets, "001-beta.md"), front("Beta"));
  const io = captureIo(dir);

  const code = await run(["list"], io);

  expect(code).toBe(0);
  expect(io.err().toLowerCase()).toContain("duplicate");
  expect(io.err()).toContain("001");
  expect(io.out()).toContain("Alpha");
  expect(io.out()).toContain("Beta");
});

test("a configured prefix is shown alongside the ticket number", async () => {
  const dir = await initedRepo();
  await run(["new", "Fix the login redirect"], captureIo(dir));
  const configPath = join(dir, "moth.config.yml");
  writeFileSync(configPath, readFileSync(configPath, "utf8").replace('prefix: ""', "prefix: ENG"));
  const io = captureIo(dir);

  await run(["list"], io);

  expect(io.out()).toContain("ENG-001");
});

test("tickets are ordered by priority, then by age", async () => {
  const dir = await initedRepo();
  await run(["new", "First filed"], captureIo(dir));
  await run(["new", "Second filed"], captureIo(dir));
  await run(["new", "Third filed"], captureIo(dir));
  await run(["edit", "3", "--priority", "urgent"], captureIo(dir));
  await run(["edit", "2", "--priority", "low"], captureIo(dir));
  const io = captureIo(dir);

  await run(["list", "--json"], io);

  // urgent, then low, then none; ties would fall back to age
  expect((JSON.parse(io.out()) as { id: number }[]).map((t) => t.id)).toEqual([3, 2, 1]);
});
