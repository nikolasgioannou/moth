import { afterAll, expect, test } from "bun:test";
import { writeFileSync } from "node:fs";
import { run } from "../src/run.ts";
import { captureIo } from "./helpers/capture-io.ts";
import { parseFrontmatter } from "./helpers/frontmatter.ts";
import { initedRepo } from "./helpers/repo-fixture.ts";
import { newTicket, ticketPath, ticketText } from "./helpers/tickets.ts";
import { cleanupTempDirs } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

const fields = (dir: string, id: string) => parseFrontmatter(ticketText(dir, id)).data;

async function repoWith(...titles: string[]): Promise<[string, string[]]> {
  const dir = await initedRepo();
  const made: string[] = [];
  for (const title of titles) made.push(await newTicket(dir, title));
  return [dir, made];
}

async function listed(dir: string, ...args: string[]): Promise<string[]> {
  const io = captureIo(dir);
  await run(["list", "--json", ...args], io);
  return (JSON.parse(io.out()) as { id: string }[]).map((ticket) => ticket.id).sort();
}

test("a ticket records what blocks it, in one direction only", async () => {
  const [dir, [blocker, blocked]] = await repoWith("Design the schema", "Build the writer");

  expect(await run(["edit", blocked ?? "", "--blocked-by", blocker ?? ""], captureIo(dir))).toBe(0);

  expect(fields(dir, blocked ?? "").blocked_by).toEqual([blocker ?? ""]);
  expect(fields(dir, blocker ?? "")).not.toHaveProperty("blocks");
});

test("showing a blocker lists what it blocks, derived at read time", async () => {
  const [dir, [blocker, blocked]] = await repoWith("Design the schema", "Build the writer");
  await run(["edit", blocked ?? "", "--blocked-by", blocker ?? ""], captureIo(dir));
  const io = captureIo(dir);

  await run(["show", blocker ?? ""], io);

  expect(io.out()).toContain("blocks");
  expect(io.out()).toContain(blocked ?? "");
});

test("blocked and unblocked filter on whether a blocker is still open", async () => {
  const [dir, [blocker, blocked]] = await repoWith("Design the schema", "Build the writer");
  await run(["edit", blocked ?? "", "--blocked-by", blocker ?? ""], captureIo(dir));

  expect(await listed(dir, "--blocked")).toEqual([blocked ?? ""]);
  expect(await listed(dir, "--unblocked")).toEqual([blocker ?? ""]);

  await run(["move", blocker ?? "", "done"], captureIo(dir));

  expect(await listed(dir, "--blocked")).toEqual([]);
  expect(await listed(dir, "--unblocked")).toEqual([blocker ?? "", blocked ?? ""].sort());
});

test("a blocker in a canceled status no longer blocks", async () => {
  const [dir, [blocker, blocked]] = await repoWith("Design the schema", "Build the writer");
  await run(["edit", blocked ?? "", "--blocked-by", blocker ?? ""], captureIo(dir));

  await run(["move", blocker ?? "", "canceled"], captureIo(dir));

  expect(await listed(dir, "--blocked")).toEqual([]);
});

test("a reference to a ticket that does not exist warns without failing", async () => {
  const [dir, [only]] = await repoWith("Build the writer");
  const path = ticketPath(dir, only ?? "");
  writeFileSync(
    path,
    ticketText(dir, only ?? "").replace("labels: []", "labels: []\nblocked_by:\n  - deadbe"),
  );
  const io = captureIo(dir);

  const code = await run(["list"], io);

  expect(code).toBe(0);
  expect(io.err()).toContain("deadbe");
  expect(io.out()).toContain("Build the writer");
});
