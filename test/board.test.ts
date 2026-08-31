import { afterAll, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { run } from "../src/run.ts";
import { captureIo } from "./helpers/capture-io.ts";
import { initedRepo } from "./helpers/repo-fixture.ts";
import { givenTicket } from "./helpers/tickets.ts";
import { cleanupTempDirs } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

async function board(dir: string, ...args: string[]): Promise<string> {
  const io = captureIo(dir);
  const code = await run(["board", ...args], io);
  expect(code).toBe(0);
  expect(io.err()).toBe("");
  return io.out();
}

test("board prints markdown grouped by status", async () => {
  const dir = await initedRepo();
  await givenTicket(dir, { title: "Write the parser", status: "in-progress" });
  await givenTicket(dir, { title: "Ship the binary" });

  const out = await board(dir);

  expect(out).toContain("## in-progress");
  expect(out).toContain("## backlog");
  expect(out).toContain("Write the parser");
  expect(out).toContain("Ship the binary");
  expect(out.indexOf("## in-progress")).toBeLessThan(out.indexOf("Write the parser"));
});

test("board writes nothing to disk", async () => {
  const dir = await initedRepo();
  await givenTicket(dir, { title: "Write the parser" });
  const before = readdirSync(join(dir, ".moth"));
  const rootBefore = readdirSync(dir);

  await board(dir);

  expect(readdirSync(join(dir, ".moth"))).toEqual(before);
  expect(readdirSync(dir)).toEqual(rootBefore);
});

test("board honours the same filters as list", async () => {
  const dir = await initedRepo();
  await givenTicket(dir, { title: "Write the parser", status: "in-progress" });
  await givenTicket(dir, { title: "Ship the binary" });
  await run(["edit", "2", "--label", "release"], captureIo(dir));

  expect(await board(dir, "--category", "started")).toContain("Write the parser");
  expect(await board(dir, "--category", "started")).not.toContain("Ship the binary");
  expect(await board(dir, "--label", "release")).toContain("Ship the binary");
  expect(await board(dir, "--search", "parser")).not.toContain("Ship the binary");
});
