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

test("removing a ticket's only blocker leaves it unblocked", async () => {
  const [dir, [blocker, blocked]] = await repoWith("Design the schema", "Build the writer");
  await run(["edit", blocked ?? "", "--blocked-by", blocker ?? ""], captureIo(dir));

  expect(await run(["edit", blocked ?? "", "--unblock", blocker ?? ""], captureIo(dir))).toBe(0);

  expect(fields(dir, blocked ?? "")).not.toHaveProperty("blocked_by");
  expect(await listed(dir, "--blocked")).toEqual([]);
});

test("removing one of several blockers keeps the rest", async () => {
  const [dir, [first, second, blocked]] = await repoWith("Design", "Review", "Build");
  await run(
    ["edit", blocked ?? "", "--blocked-by", first ?? "", "--blocked-by", second ?? ""],
    captureIo(dir),
  );

  await run(["edit", blocked ?? "", "--unblock", first ?? ""], captureIo(dir));

  expect(fields(dir, blocked ?? "").blocked_by).toEqual([second ?? ""]);
});

test("a blocker whose ticket no longer exists can still be removed", async () => {
  const [dir, [blocked]] = await repoWith("Build the writer");
  const path = ticketPath(dir, blocked ?? "");
  writeFileSync(
    path,
    ticketText(dir, blocked ?? "").replace("---\n\n", 'blocked_by:\n  - "abc123"\n---\n\n'),
  );

  expect(await run(["edit", blocked ?? "", "--unblock", "abc123"], captureIo(dir))).toBe(0);

  expect(fields(dir, blocked ?? "")).not.toHaveProperty("blocked_by");
});

test("deleting a ticket removes the links that pointed at it, and says so", async () => {
  const [dir, [blocker, blocked, child]] = await repoWith("Design", "Build", "Polish");
  await run(["edit", blocked ?? "", "--blocked-by", blocker ?? ""], captureIo(dir));
  await run(["edit", child ?? "", "--parent", blocker ?? ""], captureIo(dir));
  const io = captureIo(dir);

  expect(await run(["delete", blocker ?? "", "--yes"], io)).toBe(0);

  expect(fields(dir, blocked ?? "")).not.toHaveProperty("blocked_by");
  expect(fields(dir, child ?? "")).not.toHaveProperty("parent");
  expect(io.out()).toContain(`${blocked} is no longer blocked by ${blocker}`);
  expect(io.out()).toContain(`${child} no longer has parent ${blocker}`);
  expect(await run(["check"], captureIo(dir))).toBe(0);
});

test("check --fix leaves a missing blocker alone, and says how to remove it", async () => {
  const [dir, [blocked]] = await repoWith("Build");
  writeFileSync(
    ticketPath(dir, blocked ?? ""),
    ticketText(dir, blocked ?? "").replace("---\n\n", 'blocked_by:\n  - "abc123"\n---\n\n'),
  );
  const io = captureIo(dir);

  // The blocker may exist on another branch, so removing it could lose a real link.
  expect(await run(["check", "--fix"], io)).toBe(1);

  expect(fields(dir, blocked ?? "").blocked_by).toEqual(["abc123"]);
  expect(io.err()).toContain(`moth edit ${blocked} --unblock abc123`);
});

test("a ticket can be filed already blocked, by one ticket or several", async () => {
  const [dir, [first, second]] = await repoWith("Design the schema", "Review the schema");

  const blocked = await newTicket(dir, "Build the writer", [
    "--blocked-by",
    first ?? "",
    "--blocked-by",
    second ?? "",
  ]);

  expect(fields(dir, blocked).blocked_by).toEqual([first ?? "", second ?? ""].sort());
  expect(await listed(dir, "--blocked")).toEqual([blocked]);
});

test("filing a ticket with an unknown blocker writes nothing", async () => {
  const [dir] = await repoWith("Design the schema");
  const io = captureIo(dir);

  expect(await run(["new", "Build the writer", "--blocked-by", "nothing like it"], io)).toBe(1);

  expect(await listed(dir)).toHaveLength(1);
});
