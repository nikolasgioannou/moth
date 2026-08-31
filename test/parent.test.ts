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
