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

test("sub-tickets nest to any depth", async () => {
  const [dir, [top, middle, bottom]] = await repoWith(
    "Browser",
    "Chrome on the VM",
    "Pin a version",
  );
  await run(["edit", middle ?? "", "--parent", top ?? ""], captureIo(dir));

  expect(await run(["edit", bottom ?? "", "--parent", middle ?? ""], captureIo(dir))).toBe(0);

  expect(fields(dir, bottom ?? "").parent).toBe(middle ?? "");
  expect(await run(["check"], captureIo(dir))).toBe(0);
});

test("a ticket that already has children can be given a parent", async () => {
  const [dir, [top, middle, other]] = await repoWith("Parser", "Quoted strings", "Milestone");
  await run(["edit", middle ?? "", "--parent", top ?? ""], captureIo(dir));

  expect(await run(["edit", top ?? "", "--parent", other ?? ""], captureIo(dir))).toBe(0);

  expect(fields(dir, top ?? "").parent).toBe(other ?? "");
});

test("a parent that would form a cycle is refused, naming the cycle", async () => {
  const [dir, [top, middle, bottom]] = await repoWith(
    "Browser",
    "Chrome on the VM",
    "Pin a version",
  );
  await run(["edit", middle ?? "", "--parent", top ?? ""], captureIo(dir));
  await run(["edit", bottom ?? "", "--parent", middle ?? ""], captureIo(dir));
  const io = captureIo(dir);

  expect(await run(["edit", top ?? "", "--parent", bottom ?? ""], io)).toBe(1);

  expect(io.err()).toContain(`cycle: ${top} -> ${bottom} -> ${middle} -> ${top}`);
  expect(fields(dir, top ?? "").parent).toBeUndefined();
});

test("a parent can be cleared", async () => {
  const [dir, [parent, child]] = await repoWith("Browser", "Chrome on the VM");
  await run(["edit", child ?? "", "--parent", parent ?? ""], captureIo(dir));

  expect(await run(["edit", child ?? "", "--parent", "none"], captureIo(dir))).toBe(0);

  expect(fields(dir, child ?? "")).not.toHaveProperty("parent");
});

test("listing shows a sub-ticket's whole chain of parents, outermost first", async () => {
  const [dir, [top, middle, bottom]] = await repoWith(
    "Browser",
    "Chrome on the VM",
    "Pin a version",
  );
  await run(["edit", middle ?? "", "--parent", top ?? ""], captureIo(dir));
  await run(["edit", bottom ?? "", "--parent", middle ?? ""], captureIo(dir));
  const io = captureIo(dir);

  await run(["list"], io);

  const row =
    io
      .out()
      .split("\n")
      .find((line) => line.includes("Pin a version")) ?? "";
  expect(row).toContain(`${top} \u203a ${middle}`);
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

test("a cycle through a ticket with a number-like id is still refused", async () => {
  const dir = await initedRepo();
  const top = await newTicket(dir, "Parser", [], { randomHex: () => "66428e" });
  const child = await newTicket(dir, "Quoted strings");
  await run(["edit", child, "--parent", top], captureIo(dir));
  const io = captureIo(dir);

  expect(await run(["edit", top, "--parent", child], io)).toBe(1);
  expect(io.err()).toContain("cycle");
});

test("a blocker whose id looks like a number survives the round trip", async () => {
  const dir = await initedRepo();
  const blocker = await newTicket(dir, "Parser", [], { randomHex: () => "50735e" });
  const blocked = await newTicket(dir, "Quoted strings");

  expect(await run(["edit", blocked, "--blocked-by", blocker], captureIo(dir))).toBe(0);

  expect(fields(dir, blocked).blocked_by).toEqual(["50735e"]);
  expect(await run(["check"], captureIo(dir))).toBe(0);
});

async function listedIds(dir: string, ...args: string[]): Promise<string[]> {
  const io = captureIo(dir);
  await run(["list", "--json", ...args], io);
  return (JSON.parse(io.out()) as { id: string }[]).map((ticket) => ticket.id).sort();
}

test("listing by parent gives that ticket's sub-tickets, and none gives top-level tickets", async () => {
  const dir = await initedRepo();
  const milestone = await newTicket(dir, "Browser milestone");
  const other = await newTicket(dir, "Billing milestone");
  const chrome = await newTicket(dir, "Chrome on the VM", ["--parent", milestone]);
  const locks = await newTicket(dir, "Domain locks", ["--parent", milestone]);
  const invoices = await newTicket(dir, "Invoices", ["--parent", other]);

  expect(await listedIds(dir, "--parent", milestone)).toEqual([chrome, locks].sort());
  expect(await listedIds(dir, "--parent", `${milestone},${other}`)).toEqual(
    [chrome, locks, invoices].sort(),
  );
  expect(await listedIds(dir, "--parent", "none")).toEqual([milestone, other].sort());
});

test("listing by a parent that names no ticket is an error, not an empty list", async () => {
  const dir = await initedRepo();
  await newTicket(dir, "Browser milestone");
  const io = captureIo(dir);

  expect(await run(["list", "--parent", "no such thing"], io)).toBe(1);
  expect(io.err()).toContain("no parent matches");
});

test("the board takes the parent filter too", async () => {
  const dir = await initedRepo();
  const milestone = await newTicket(dir, "Browser milestone");
  const chrome = await newTicket(dir, "Chrome on the VM", ["--parent", milestone]);
  const io = captureIo(dir);

  expect(await run(["board", "--parent", milestone], io)).toBe(0);
  expect(io.out()).toContain(chrome);
  expect(io.out()).not.toContain(`**${milestone}**`);
});
