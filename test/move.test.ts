import { afterAll, expect, test } from "bun:test";
import { run } from "../src/run.ts";
import { captureIo } from "./helpers/capture-io.ts";
import { parseFrontmatter } from "./helpers/frontmatter.ts";
import { initedRepo } from "./helpers/repo-fixture.ts";
import { newTicket, ticketText } from "./helpers/tickets.ts";
import { cleanupTempDirs } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

test("move puts a ticket in a status the repo defined", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix the login redirect", ["--body", "Stale cookie."]);
  const io = captureIo(dir);

  const code = await run(["move", id, "in-progress"], io);

  expect(code).toBe(0);
  const parsed = parseFrontmatter(ticketText(dir, id));
  expect(parsed.data.status).toBe("in-progress");
  expect(parsed.body).toBe("Stale cookie.\n");
});

test("moving to a status the repo has not defined fails and lists the legal ones", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix the login redirect");
  const io = captureIo(dir);

  const code = await run(["move", id, "shipped"], io);

  expect(code).toBe(1);
  expect(io.err()).toContain("shipped");
  expect(io.err()).toContain("in-progress");
  const parsed = parseFrontmatter(ticketText(dir, id));
  expect(parsed.data.status).toBe("backlog");
});

test("moving a ticket to the status it already holds changes nothing and succeeds", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix the login redirect");
  const before = ticketText(dir, id);
  const io = captureIo(dir, { now: () => new Date("2030-01-01T00:00:00.000Z") });

  const code = await run(["move", id, "backlog"], io);

  expect(code).toBe(0);
  expect(io.err()).toBe("");
  expect(ticketText(dir, id)).toBe(before);
});

test("move prints the ticket it updated", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix the login redirect");
  const io = captureIo(dir);

  await run(["move", id, "in-progress"], io);

  expect(io.out()).toContain(id);
  expect(io.out()).toContain("Fix the login redirect");
  expect(io.out()).toContain("in-progress");
});

test("a move touches the updated timestamp and not the created one", async () => {
  const dir = await initedRepo();
  const created = "2026-01-01T00:00:00.000Z";
  const id = await newTicket(dir, "Fix the login redirect", [], { now: () => new Date(created) });
  const moved = "2026-06-15T12:00:00.000Z";

  await run(["move", id, "in-progress"], captureIo(dir, { now: () => new Date(moved) }));

  const data = parseFrontmatter(ticketText(dir, id)).data;
  expect(data.created_at).toBe(created);
  expect(data.updated_at).toBe(moved);
});

test("a ticket can move into a status from each of the six categories", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix the login redirect");

  for (const status of ["backlog", "todo", "in-progress", "done", "canceled", "duplicate"]) {
    const io = captureIo(dir);

    expect(await run(["move", id, status], io)).toBe(0);

    const listed = captureIo(dir);
    await run(["list"], listed);
    const headings = listed
      .out()
      .split("\n")
      .filter((line) => line !== "" && !line.startsWith(" "));
    expect(headings).toEqual([status]);
  }
});
