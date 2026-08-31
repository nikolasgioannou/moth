import { afterAll, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { run } from "../src/run.ts";
import { captureIo } from "./helpers/capture-io.ts";
import { initedRepo } from "./helpers/repo-fixture.ts";
import { givenTicket, newTicket } from "./helpers/tickets.ts";
import { cleanupTempDirs, tempDir } from "./helpers/tmp.ts";

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
    .filter((line) => /^\s+[0-9a-f]{6}\s/.test(line));
  expect(rows).toHaveLength(2);
  expect(rows.every((row) => row.includes("none"))).toBe(true);
  expect(new Set(rows.map((row) => row.indexOf("none"))).size).toBe(1);
});

test("list emits machine-readable json even on a terminal", async () => {
  const dir = await initedRepo();
  const parser = await givenTicket(dir, { title: "Write the parser", status: "in-progress" });
  const binary = await givenTicket(dir, { title: "Ship the binary" });
  const io = captureIo(dir, { isTty: true });

  const code = await run(["list", "--json"], io);

  expect(code).toBe(0);
  const tickets = JSON.parse(io.out()) as { id: string }[];
  expect(tickets.map((ticket) => ticket.id).sort()).toEqual([parser, binary].sort());
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

test("two tickets sharing an id are reported, and both still listed", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Alpha", [], { randomHex: () => "aaaaaa" });
  const front = (title: string) =>
    `---
id: ${id}
title: ${title}
status: backlog
priority: none
labels: []
---

`;
  writeFileSync(join(dir, ".moth", `${id}-beta.md`), front("Beta"));
  const io = captureIo(dir);

  const code = await run(["list"], io);

  expect(code).toBe(0);
  expect(io.err().toLowerCase()).toContain("duplicate");
  expect(io.err()).toContain(id);
  expect(io.out()).toContain("Alpha");
  expect(io.out()).toContain("Beta");
});

test("tickets are ordered by priority, then by age", async () => {
  const dir = await initedRepo();
  const at = (day: string) => ({ now: () => new Date(`2026-01-${day}T00:00:00.000Z`) });
  const id1 = await newTicket(dir, "First filed", [], at("01"));
  const id2 = await newTicket(dir, "Second filed", [], at("02"));
  const id3 = await newTicket(dir, "Third filed", [], at("03"));
  await run(["edit", id3, "--priority", "urgent"], captureIo(dir));
  await run(["edit", id2, "--priority", "low"], captureIo(dir));
  const io = captureIo(dir);

  await run(["list", "--json"], io);

  // urgent, then low, then none; ties would fall back to age
  expect((JSON.parse(io.out()) as { id: string }[]).map((t) => t.id)).toEqual([id3, id2, id1]);
});

test("a filter matching nothing says so, rather than claiming the store is empty", async () => {
  const dir = await initedRepo();
  await newTicket(dir, "Parse the frontmatter");
  const io = captureIo(dir);

  const code = await run(["list", "--priority", "urgent"], io);

  expect(code).toBe(0);
  expect(io.out().toLowerCase()).not.toContain("no tickets yet");
  expect(io.out().toLowerCase()).toContain("no tickets match");
});
