import { afterAll, expect, test } from "bun:test";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { run } from "../src/run.ts";
import { captureIo } from "./helpers/capture-io.ts";
import { initedRepo } from "./helpers/repo-fixture.ts";
import { newTicket } from "./helpers/tickets.ts";
import { cleanupTempDirs } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

function declareField(dir: string, name: string): void {
  const path = join(dir, "moth.config.yml");
  writeFileSync(path, `${readFileSync(path, "utf8")}\nfields:\n  - ${name}\n`);
}

function ticketPath(dir: string): string {
  const tickets = join(dir, ".moth");
  return join(tickets, readdirSync(tickets)[0] ?? "");
}

test("the schema names every legal field, status with its category, and priority", async () => {
  const dir = await initedRepo();
  declareField(dir, "customer");
  const io = captureIo(dir);

  const code = await run(["schema", "--json"], io);

  expect(code).toBe(0);
  const schema = JSON.parse(io.out());
  expect(schema.priorities).toEqual(["none", "low", "medium", "high", "urgent"]);
  expect(schema.statuses).toContainEqual({ name: "in-progress", category: "started" });
  expect(schema.categories).toEqual([
    "backlog",
    "unstarted",
    "started",
    "completed",
    "canceled",
    "duplicate",
  ]);
  expect(schema.fields.core).toContain("title");
  expect(schema.fields.custom).toEqual(["customer"]);
});

test("a field declared in config is accepted on a ticket", async () => {
  const dir = await initedRepo();
  declareField(dir, "customer");
  const id = await newTicket(dir, "Fix the redirect");

  const code = await run(["edit", id, "--set", "customer=acme"], captureIo(dir));

  expect(code).toBe(0);
  expect(readFileSync(ticketPath(dir), "utf8")).toContain("customer: acme");
});

test("a field not declared in config is refused, and the error names it", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix the redirect");
  const io = captureIo(dir);

  const code = await run(["edit", id, "--set", "severity=high"], io);

  expect(code).toBe(1);
  expect(io.err()).toContain("severity");
  expect(readFileSync(ticketPath(dir), "utf8")).not.toContain("severity");
});

test("a hand-edited undeclared field is reported when read", async () => {
  const dir = await initedRepo();
  await newTicket(dir, "Fix the redirect");
  const path = ticketPath(dir);
  writeFileSync(
    path,
    readFileSync(path, "utf8").replace("labels: []", "labels: []\nseverity: high"),
  );
  const io = captureIo(dir);

  const code = await run(["list"], io);

  expect(code).toBe(0);
  expect(io.err()).toContain("severity");
  expect(io.out()).toContain("Fix the redirect");
});

test("a status absent from config is reported when read", async () => {
  const dir = await initedRepo();
  await newTicket(dir, "Fix the redirect");
  const path = ticketPath(dir);
  writeFileSync(path, readFileSync(path, "utf8").replace("status: backlog", "status: shipped"));
  const io = captureIo(dir);

  await run(["list"], io);

  expect(io.err()).toContain("shipped");
});
