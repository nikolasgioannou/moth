import { afterAll, expect, test } from "bun:test";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { run } from "../src/run.ts";
import { captureIo } from "./capture-io.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { initedRepo } from "./repo-fixture.ts";
import { cleanupTempDirs } from "./tmp.ts";

afterAll(cleanupTempDirs);

function frontmatter(dir: string, number: number) {
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

async function ids(dir: string, ...args: string[]): Promise<number[]> {
  const io = captureIo(dir);
  await run(["list", "--json", ...args], io);
  return (JSON.parse(io.out()) as { id: number }[]).map((ticket) => ticket.id).sort();
}

test("a ticket records what blocks it, in one direction only", async () => {
  const dir = await repoWith("Design the schema", "Build the writer");

  expect(await run(["edit", "2", "--blocked-by", "1"], captureIo(dir))).toBe(0);

  expect(frontmatter(dir, 2).blocked_by).toEqual([1]);
  expect(frontmatter(dir, 1)).not.toHaveProperty("blocks");
});

test("showing a blocker lists what it blocks, derived at read time", async () => {
  const dir = await repoWith("Design the schema", "Build the writer");
  await run(["edit", "2", "--blocked-by", "1"], captureIo(dir));
  const io = captureIo(dir);

  await run(["show", "1"], io);

  expect(io.out()).toContain("blocks");
  expect(io.out()).toContain("002");
});

test("blocked and unblocked filter on whether a blocker is still open", async () => {
  const dir = await repoWith("Design the schema", "Build the writer");
  await run(["edit", "2", "--blocked-by", "1"], captureIo(dir));

  expect(await ids(dir, "--blocked")).toEqual([2]);
  expect(await ids(dir, "--unblocked")).toEqual([1]);

  await run(["move", "1", "done"], captureIo(dir));

  expect(await ids(dir, "--blocked")).toEqual([]);
  expect(await ids(dir, "--unblocked")).toEqual([1, 2]);
});

test("a blocker in a canceled or duplicate status no longer blocks", async () => {
  const dir = await repoWith("Design the schema", "Build the writer");
  await run(["edit", "2", "--blocked-by", "1"], captureIo(dir));
  await run(["move", "1", "canceled"], captureIo(dir));

  expect(await ids(dir, "--blocked")).toEqual([]);
});

test("a reference to a ticket that does not exist warns without failing", async () => {
  const dir = await repoWith("Build the writer");
  const tickets = join(dir, ".moth");
  const file = join(tickets, readdirSync(tickets)[0] ?? "");
  writeFileSync(
    file,
    readFileSync(file, "utf8").replace("labels: []", "labels: []\nblocked_by:\n  - 99"),
  );
  const io = captureIo(dir);

  const code = await run(["list"], io);

  expect(code).toBe(0);
  expect(io.err()).toContain("099");
  expect(io.out()).toContain("Build the writer");
});
