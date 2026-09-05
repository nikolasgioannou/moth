import { afterAll, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { run } from "../src/run.ts";
import { captureIo } from "./helpers/capture-io.ts";
import { parseFrontmatter } from "./helpers/frontmatter.ts";
import { initedRepo } from "./helpers/repo-fixture.ts";
import { newTicket, ticketText } from "./helpers/tickets.ts";
import { cleanupTempDirs, tempDir } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

const PINNED = "a1b2c3";
const pinned = (dir: string, extra: Record<string, unknown> = {}) =>
  captureIo(dir, { randomHex: () => PINNED, ...extra });
const files = (dir: string) => readdirSync(join(dir, ".moth")).sort();

test("new writes exactly one ticket file", async () => {
  const dir = await initedRepo();
  const io = captureIo(dir);

  const code = await run(["new", "Fix the login redirect"], io);

  expect(code).toBe(0);
  expect(files(dir)).toHaveLength(1);
});

test("new outside an initialised repo fails and names init as the fix", async () => {
  const io = captureIo(tempDir());

  const code = await run(["new", "Something"], io);

  expect(code).toBe(1);
  expect(io.err()).toContain("init");
  expect(io.out()).toBe("");
});

test("a new ticket gets a six-character hex id, used in its filename", async () => {
  const dir = await initedRepo();

  await run(["new", "Fix the login redirect"], captureIo(dir));

  const [file] = files(dir);
  expect(file).toMatch(/^fix-the-login-redirect-[0-9a-f]{6}\.md$/);
  const id = (file ?? "").replace(/\.md$/, "").slice(-6);
  expect(parseFrontmatter(readFileSync(join(dir, ".moth", file ?? ""), "utf8")).data.id).toBe(id);
});

test("each new ticket gets an id no other ticket holds", async () => {
  const dir = await initedRepo();

  const made = [
    await newTicket(dir, "First"),
    await newTicket(dir, "Second"),
    await newTicket(dir, "Third"),
  ];

  expect(new Set(made).size).toBe(3);
});

test("an id already on disk is never handed out again", async () => {
  const dir = await initedRepo();
  await newTicket(dir, "Already here", [], { randomHex: () => "aaaaaa" });
  const drawn = ["aaaaaa", "bbbbbb"];
  let next = 0;

  await run(["new", "Second one"], captureIo(dir, { randomHex: () => drawn[next++] ?? "cccccc" }));

  expect(files(dir)).toEqual(["already-here-aaaaaa.md", "second-one-bbbbbb.md"]);
});

test("the ticket records its metadata in frontmatter", async () => {
  const dir = await initedRepo();
  const io = pinned(dir, { now: () => new Date("2026-08-30T12:00:00.000Z") });

  await run(["new", "Fix the login redirect"], io);

  expect(parseFrontmatter(ticketText(dir, PINNED)).data).toEqual({
    id: PINNED,
    title: "Fix the login redirect",
    status: "backlog",
    priority: "none",
    labels: [],
    created_at: "2026-08-30T12:00:00.000Z",
    updated_at: "2026-08-30T12:00:00.000Z",
  });
});

test("a new ticket opens in the repo's own backlog status", async () => {
  const dir = tempDir();
  await run(["init"], captureIo(dir, { answers: ["icebox"] }));

  await run(["new", "Something"], pinned(dir));

  expect(parseFrontmatter(ticketText(dir, PINNED)).data.status).toBe("icebox");
});

test("new accepts a description from a flag", async () => {
  const dir = await initedRepo();

  await run(["new", "Something", "--body", "The description."], pinned(dir));

  expect(parseFrontmatter(ticketText(dir, PINNED)).body).toBe("The description.\n");
});

test("a piped description survives quotes, backticks and code fences intact", async () => {
  const dir = await initedRepo();
  const description = [
    'The handler returns "null" when the token is stale.',
    "",
    "```ts",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: literal on purpose; this is the tricky markdown whose survival through a pipe is the assertion
    "const key = `session:${userId}`;",
    "```",
    "",
    "See `docs/auth.md` — it's out of date.",
  ].join("\n");

  await run(["new", "Stale token", "--body-file", "-"], pinned(dir, { stdin: description }));

  expect(parseFrontmatter(ticketText(dir, PINNED)).body).toBe(`${description}\n`);
});

test("new prints the ticket it created", async () => {
  const dir = await initedRepo();
  const io = pinned(dir);

  await run(["new", "Fix the login redirect"], io);

  expect(io.out()).toContain(PINNED);
  expect(io.out()).toContain("Fix the login redirect");
  expect(io.err()).toBe("");
});

test("new emits the created ticket as json on request", async () => {
  const dir = await initedRepo();
  const io = pinned(dir, { now: () => new Date("2026-08-30T12:00:00.000Z") });

  await run(["new", "Fix the login redirect", "--json", "--body", "Details."], io);

  expect(JSON.parse(io.out())).toEqual({
    id: PINNED,
    title: "Fix the login redirect",
    status: "backlog",
    priority: "none",
    labels: [],
    created_at: "2026-08-30T12:00:00.000Z",
    updated_at: "2026-08-30T12:00:00.000Z",
    body: "Details.",
  });
});

test("creating a ticket with no title fails and writes nothing", async () => {
  const dir = await initedRepo();
  const io = captureIo(dir);

  const code = await run(["new"], io);

  expect(code).toBe(2);
  expect(io.err().toLowerCase()).toContain("title");
  expect(files(dir)).toHaveLength(0);
});

test("a title of only whitespace is rejected the same way", async () => {
  const dir = await initedRepo();
  const io = captureIo(dir);

  const code = await run(["new", "   "], io);

  expect(code).toBe(2);
  expect(files(dir)).toHaveLength(0);
});

test("new files a ticket with a priority and a label in one command", async () => {
  const dir = await initedRepo();

  const id = await newTicket(dir, "Fix the login redirect", [
    "--priority",
    "high",
    "--label",
    "cli",
  ]);

  const fields = parseFrontmatter(ticketText(dir, id)).data;
  expect(fields.priority).toBe("high");
  expect(fields.labels).toEqual(["cli"]);
});

test("--label is repeatable and the labels are sorted, as on edit", async () => {
  const dir = await initedRepo();

  const id = await newTicket(dir, "Fix the login redirect", [
    "--label",
    "release",
    "--label",
    "cli",
  ]);

  expect(parseFrontmatter(ticketText(dir, id)).data.labels).toEqual(["cli", "release"]);
});

test("the same label given twice is stored once", async () => {
  const dir = await initedRepo();

  const id = await newTicket(dir, "Fix the login redirect", ["--label", "cli", "--label", "cli"]);

  expect(parseFrontmatter(ticketText(dir, id)).data.labels).toEqual(["cli"]);
});

test("an illegal priority is refused, listing the legal values, and writes nothing", async () => {
  const dir = await initedRepo();
  const io = captureIo(dir);

  const code = await run(["new", "Fix the login redirect", "--priority", "critical"], io);

  expect(code).toBe(2);
  expect(io.err()).toContain("critical");
  expect(io.err()).toContain("urgent");
  expect(readdirSync(join(dir, ".moth"))).toEqual([]);
});

test("a ticket filed without either flag still defaults to none and no labels", async () => {
  const dir = await initedRepo();

  const id = await newTicket(dir, "Fix the login redirect");

  const fields = parseFrontmatter(ticketText(dir, id)).data;
  expect(fields.priority).toBe("none");
  expect(fields.labels).toEqual([]);
});
