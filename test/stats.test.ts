import { afterAll, expect, test } from "bun:test";
import { run } from "../src/run.ts";
import { captureIo } from "./helpers/capture-io.ts";
import { initedRepo } from "./helpers/repo-fixture.ts";
import { givenTicket, newTicket } from "./helpers/tickets.ts";
import { cleanupTempDirs } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

test("stats counts tickets by status, in config order, zeros included", async () => {
  const dir = await initedRepo();
  await givenTicket(dir, { title: "Parse the frontmatter", status: "done" });
  await givenTicket(dir, { title: "Ship the binary", status: "done" });
  await givenTicket(dir, { title: "Write the docs", status: "todo" });
  const io = captureIo(dir);

  expect(await run(["stats"], io)).toBe(0);

  expect(io.out()).toBe("backlog 0 · todo 1 · in-progress 0 · done 2 · canceled 0 · duplicate 0\n");
});

test("stats takes the list filters, so a parent's progress is one command", async () => {
  const dir = await initedRepo();
  const milestone = await newTicket(dir, "Browser milestone");
  const chrome = await newTicket(dir, "Chrome on the VM", ["--parent", milestone]);
  await newTicket(dir, "Domain locks", ["--parent", milestone]);
  await newTicket(dir, "Unrelated");
  await run(["move", chrome, "done"], captureIo(dir));
  const io = captureIo(dir);

  await run(["stats", "--parent", milestone, "--json"], io);

  const counts = JSON.parse(io.out());
  expect(counts.total).toBe(2);
  expect(counts.statuses).toMatchObject({ backlog: 1, done: 1, todo: 0 });
});

test("stats --json gives the same counts as the line", async () => {
  const dir = await initedRepo();
  await givenTicket(dir, { title: "Parse the frontmatter", status: "done" });
  const io = captureIo(dir);

  await run(["stats", "--json"], io);

  expect(JSON.parse(io.out())).toEqual({
    total: 1,
    statuses: { backlog: 0, todo: 0, "in-progress": 0, done: 1, canceled: 0, duplicate: 0 },
  });
});
