import { afterAll, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { run } from "../src/run.ts";
import { captureIo } from "./helpers/capture-io.ts";
import { parseFrontmatter } from "./helpers/frontmatter.ts";
import { initedRepo } from "./helpers/repo-fixture.ts";
import { cleanupTempDirs } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

function ticket(dir: string, number: number) {
  const tickets = join(dir, ".moth");
  const file = readdirSync(tickets).find((name) =>
    name.startsWith(String(number).padStart(3, "0")),
  );
  return parseFrontmatter(readFileSync(join(tickets, file ?? ""), "utf8")).data;
}

async function repoWith(...titles: string[]): Promise<string> {
  const dir = await initedRepo();
  for (const title of titles) await run(["new", title], captureIo(dir));
  return dir;
}

test("a ticket can be given a parent at creation", async () => {
  const dir = await repoWith("Build the parser");

  const code = await run(["new", "Handle quoted strings", "--parent", "1"], captureIo(dir));

  expect(code).toBe(0);
  expect(ticket(dir, 2).parent).toBe(1);
});

test("a ticket can be given a parent by editing", async () => {
  const dir = await repoWith("Build the parser", "Handle quoted strings");

  expect(await run(["edit", "2", "--parent", "1"], captureIo(dir))).toBe(0);
  expect(ticket(dir, 2).parent).toBe(1);
});

test("a ticket cannot be its own parent", async () => {
  const dir = await repoWith("Build the parser");
  const io = captureIo(dir);

  const code = await run(["edit", "1", "--parent", "1"], io);

  expect(code).toBe(1);
  expect(io.err().toLowerCase()).toContain("own parent");
  expect(ticket(dir, 1).parent).toBeUndefined();
});

test("nesting is held to one level", async () => {
  const dir = await repoWith("Build the parser", "Handle quoted strings", "Escape backslashes");
  await run(["edit", "2", "--parent", "1"], captureIo(dir));
  const io = captureIo(dir);

  // 2 already has a parent, so it cannot become one itself
  const code = await run(["edit", "3", "--parent", "2"], io);

  expect(code).toBe(1);
  expect(io.err().toLowerCase()).toContain("one level");
  expect(ticket(dir, 3).parent).toBeUndefined();
});

test("a ticket that already has children cannot be given a parent", async () => {
  const dir = await repoWith("Build the parser", "Handle quoted strings", "Escape backslashes");
  await run(["edit", "2", "--parent", "1"], captureIo(dir));
  const io = captureIo(dir);

  const code = await run(["edit", "1", "--parent", "3"], io);

  expect(code).toBe(1);
  expect(io.err().toLowerCase()).toContain("one level");
});

test("listing shows which ticket a sub-ticket belongs to", async () => {
  const dir = await repoWith("Build the parser", "Handle quoted strings");
  await run(["edit", "2", "--parent", "1"], captureIo(dir));
  const io = captureIo(dir);

  await run(["list"], io);

  const row =
    io
      .out()
      .split("\n")
      .find((line) => line.includes("Handle quoted strings")) ?? "";
  expect(row).toContain("001");
});
