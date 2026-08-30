import { afterAll, expect, test } from "bun:test";
import { captureIo } from "../test/io.ts";
import { initedRepo } from "../test/repo.ts";
import { givenTicket } from "../test/tickets.ts";
import { cleanupTempDirs, tempDir } from "../test/tmp.ts";
import { run } from "./run.ts";

afterAll(cleanupTempDirs);

test("list groups tickets under their status", async () => {
  const dir = await initedRepo({ prefix: "ENG" });
  await givenTicket(dir, { title: "Write the parser", hex: "0001", status: "in-progress" });
  await givenTicket(dir, { title: "Ship the binary", hex: "0002" });
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
  const dir = await initedRepo({ prefix: "ENG" });
  const io = captureIo(dir);

  const code = await run(["list"], io);

  expect(code).toBe(0);
  expect(io.out().toLowerCase()).toContain("no tickets");
  expect(io.err()).toBe("");
});

test("columns stay aligned regardless of title length", async () => {
  const dir = await initedRepo({ prefix: "ENG" });
  await givenTicket(dir, { title: "Short", hex: "0001" });
  await givenTicket(dir, { title: "A considerably longer ticket title", hex: "0002" });
  const io = captureIo(dir);

  await run(["list"], io);

  const rows = io
    .out()
    .split("\n")
    .filter((line) => line.includes("ENG-"));
  expect(rows).toHaveLength(2);
  expect(rows.every((row) => row.includes("none"))).toBe(true);
  expect(new Set(rows.map((row) => row.indexOf("none"))).size).toBe(1);
});

test("list emits machine-readable json even on a terminal", async () => {
  const dir = await initedRepo({ prefix: "ENG" });
  await givenTicket(dir, { title: "Write the parser", hex: "0001", status: "in-progress" });
  await givenTicket(dir, { title: "Ship the binary", hex: "0002" });
  const io = captureIo(dir, { isTty: true });

  const code = await run(["list", "--json"], io);

  expect(code).toBe(0);
  const tickets = JSON.parse(io.out()) as { id: string }[];
  expect(tickets.map((ticket) => ticket.id).sort()).toEqual(["ENG-0001", "ENG-0002"]);
  expect(tickets[0]).not.toHaveProperty("body");
  expect(io.out()).not.toContain(String.fromCharCode(27));
});

test("colour appears on a terminal and is absent when piped", async () => {
  const dir = await initedRepo({ prefix: "ENG" });
  await givenTicket(dir, { title: "Write the parser", hex: "0001" });
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
