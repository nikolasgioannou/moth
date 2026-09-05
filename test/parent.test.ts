import { afterAll, expect, test } from "bun:test";
import { run } from "../src/run.ts";
import { captureIo } from "./helpers/capture-io.ts";
import { parseFrontmatter } from "./helpers/frontmatter.ts";
import { initedRepo } from "./helpers/repo-fixture.ts";
import { newTicket, ticketText } from "./helpers/tickets.ts";
import { cleanupTempDirs } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

const fields = (dir: string, id: string) => parseFrontmatter(ticketText(dir, id)).data;

async function repoWith(...titles: string[]): Promise<[string, string[]]> {
  const dir = await initedRepo();
  const ids: string[] = [];
  for (const title of titles) ids.push(await newTicket(dir, title));
  return [dir, ids];
}

test("a ticket can be given a parent at creation", async () => {
  const [dir, [parent]] = await repoWith("Build the parser");

  const io = captureIo(dir);
  const code = await run(["new", "Handle quoted strings", "--parent", parent ?? ""], io);

  expect(code).toBe(0);
  const child = io.out().trim().split(/\s+/)[0] ?? "";
  expect(fields(dir, child).parent).toBe(parent);
});

test("a ticket can be given a parent by editing", async () => {
  const [dir, [parent, child]] = await repoWith("Build the parser", "Handle quoted strings");

  expect(await run(["edit", child ?? "", "--parent", parent ?? ""], captureIo(dir))).toBe(0);
  expect(fields(dir, child ?? "").parent).toBe(parent);
});

test("a ticket cannot be its own parent", async () => {
  const [dir, [only]] = await repoWith("Build the parser");
  const io = captureIo(dir);

  const code = await run(["edit", only ?? "", "--parent", only ?? ""], io);

  expect(code).toBe(1);
  expect(io.err().toLowerCase()).toContain("own parent");
  expect(fields(dir, only ?? "").parent).toBeUndefined();
});

test("nesting is held to one level", async () => {
  const [dir, [top, middle, bottom]] = await repoWith("Parser", "Quoted strings", "Backslashes");
  await run(["edit", middle ?? "", "--parent", top ?? ""], captureIo(dir));
  const io = captureIo(dir);

  const code = await run(["edit", bottom ?? "", "--parent", middle ?? ""], io);

  expect(code).toBe(1);
  expect(io.err().toLowerCase()).toContain("one level");
  expect(fields(dir, bottom ?? "").parent).toBeUndefined();
});

test("a ticket that already has children cannot be given a parent", async () => {
  const [dir, [top, middle, other]] = await repoWith("Parser", "Quoted strings", "Backslashes");
  await run(["edit", middle ?? "", "--parent", top ?? ""], captureIo(dir));
  const io = captureIo(dir);

  const code = await run(["edit", top ?? "", "--parent", other ?? ""], io);

  expect(code).toBe(1);
  expect(io.err().toLowerCase()).toContain("one level");
});

test("listing shows which ticket a sub-ticket belongs to", async () => {
  const [dir, [parent, child]] = await repoWith("Build the parser", "Handle quoted strings");
  await run(["edit", child ?? "", "--parent", parent ?? ""], captureIo(dir));
  const io = captureIo(dir);

  await run(["list"], io);

  const row =
    io
      .out()
      .split("\n")
      .find((line) => line.includes("Handle quoted strings")) ?? "";
  expect(row).toContain(parent ?? "");
});

// 66428e is emitted bare by the YAML writer and read back as the number 66428
// by the parser, which detached the child and let the one-level rule be
// bypassed. Digits then a trailing `e` is the shape the two disagree on: 0.6% of
// random ids, which is why this only ever failed intermittently.
test("a parent whose id looks like a number survives the round trip", async () => {
  const dir = await initedRepo();
  const top = await newTicket(dir, "Parser", [], { randomHex: () => "66428e" });
  const child = await newTicket(dir, "Quoted strings");

  expect(await run(["edit", child, "--parent", top], captureIo(dir))).toBe(0);

  expect(fields(dir, child).parent).toBe("66428e");
  expect(ticketText(dir, child)).toContain('parent: "66428e"');
});

test("a ticket with a number-like id still counts as having children", async () => {
  const dir = await initedRepo();
  const top = await newTicket(dir, "Parser", [], { randomHex: () => "66428e" });
  const child = await newTicket(dir, "Quoted strings");
  const other = await newTicket(dir, "Backslashes");
  await run(["edit", child, "--parent", top], captureIo(dir));
  const io = captureIo(dir);

  const code = await run(["edit", top, "--parent", other], io);

  expect(code).toBe(1);
  expect(io.err().toLowerCase()).toContain("one level");
});

test("a blocker whose id looks like a number survives the round trip", async () => {
  const dir = await initedRepo();
  const blocker = await newTicket(dir, "Parser", [], { randomHex: () => "50735e" });
  const blocked = await newTicket(dir, "Quoted strings");

  expect(await run(["edit", blocked, "--blocked-by", blocker], captureIo(dir))).toBe(0);

  expect(fields(dir, blocked).blocked_by).toEqual(["50735e"]);
  expect(await run(["check"], captureIo(dir))).toBe(0);
});
