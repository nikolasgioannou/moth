import { afterAll, expect, test } from "bun:test";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { run } from "../src/run.ts";
import { captureIo } from "./capture-io.ts";
import { initedRepo } from "./repo-fixture.ts";
import { cleanupTempDirs } from "./tmp.ts";

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
  await run(["new", "Fix the redirect"], captureIo(dir));

  const code = await run(["edit", "1", "--set", "customer=acme"], captureIo(dir));

  expect(code).toBe(0);
  expect(readFileSync(ticketPath(dir), "utf8")).toContain("customer: acme");
});

test("a field not declared in config is refused, and the error names it", async () => {
  const dir = await initedRepo();
  await run(["new", "Fix the redirect"], captureIo(dir));
  const io = captureIo(dir);

  const code = await run(["edit", "1", "--set", "severity=high"], io);

  expect(code).toBe(1);
  expect(io.err()).toContain("severity");
  expect(readFileSync(ticketPath(dir), "utf8")).not.toContain("severity");
});

test("a hand-edited undeclared field is reported when read", async () => {
  const dir = await initedRepo();
  await run(["new", "Fix the redirect"], captureIo(dir));
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
  await run(["new", "Fix the redirect"], captureIo(dir));
  const path = ticketPath(dir);
  writeFileSync(path, readFileSync(path, "utf8").replace("status: backlog", "status: shipped"));
  const io = captureIo(dir);

  await run(["list"], io);

  expect(io.err()).toContain("shipped");
});
