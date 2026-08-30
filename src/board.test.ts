import { afterAll, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { captureIo } from "../test/io.ts";
import { initedRepo } from "../test/repo.ts";
import { givenTicket } from "../test/tickets.ts";
import { cleanupTempDirs } from "../test/tmp.ts";
import { run } from "./run.ts";

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
  const before = readdirSync(join(dir, ".moth", "tickets"));
  const rootBefore = readdirSync(dir);

  await board(dir);

  expect(readdirSync(join(dir, ".moth", "tickets"))).toEqual(before);
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
