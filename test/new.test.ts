import { afterAll, expect, test } from "bun:test";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { run } from "../src/run.ts";
import { captureIo } from "./capture-io.ts";
import { parseFrontmatter } from "./frontmatter.ts";
import { initedRepo } from "./repo-fixture.ts";
import { cleanupTempDirs, tempDir } from "./tmp.ts";

afterAll(cleanupTempDirs);

test("new writes exactly one ticket file", async () => {
  const dir = await initedRepo();
  const io = captureIo(dir);

  const code = await run(["new", "Fix the login redirect"], io);

  expect(code).toBe(0);
  expect(readdirSync(join(dir, ".moth"))).toHaveLength(1);
});

test("new outside an initialised repo fails and names init as the fix", async () => {
  const dir = tempDir();
  const io = captureIo(dir);

  const code = await run(["new", "Something"], io);

  expect(code).toBe(1);
  expect(io.err()).toContain("init");
  expect(io.out()).toBe("");
});

test("the ticket records its metadata in frontmatter", async () => {
  const dir = await initedRepo();
  const io = captureIo(dir, {
    now: () => new Date("2026-08-30T12:00:00.000Z"),
  });

  await run(["new", "Fix the login redirect"], io);

  const raw = readFileSync(join(dir, ".moth", "001-fix-the-login-redirect.md"), "utf8");
  expect(parseFrontmatter(raw).data).toEqual({
    id: 1,
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
  const io = captureIo(dir);

  await run(["new", "Something"], io);

  const raw = readFileSync(join(dir, ".moth", "001-something.md"), "utf8");
  expect(parseFrontmatter(raw).data.status).toBe("icebox");
});

test("new accepts a description from a flag", async () => {
  const dir = await initedRepo();
  const io = captureIo(dir);

  await run(["new", "Something", "--body", "The description."], io);

  const raw = readFileSync(join(dir, ".moth", "001-something.md"), "utf8");
  expect(parseFrontmatter(raw).body).toBe("The description.\n");
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
  const io = captureIo(dir, { stdin: description });

  await run(["new", "Stale token", "--body-file", "-"], io);

  const raw = readFileSync(join(dir, ".moth", "001-stale-token.md"), "utf8");
  expect(parseFrontmatter(raw).body).toBe(`${description}\n`);
});

test("new prints the ticket it created", async () => {
  const dir = await initedRepo();
  const io = captureIo(dir);

  await run(["new", "Fix the login redirect"], io);

  expect(io.out()).toContain("001");
  expect(io.out()).toContain("Fix the login redirect");
  expect(io.err()).toBe("");
});

test("new emits the created ticket as json on request", async () => {
  const dir = await initedRepo();
  const io = captureIo(dir, {
    now: () => new Date("2026-08-30T12:00:00.000Z"),
  });

  await run(["new", "Fix the login redirect", "--json", "--body", "Details."], io);

  expect(JSON.parse(io.out())).toEqual({
    id: 1,
    title: "Fix the login redirect",
    status: "backlog",
    priority: "none",
    labels: [],
    created_at: "2026-08-30T12:00:00.000Z",
    updated_at: "2026-08-30T12:00:00.000Z",
    body: "Details.",
  });
});

test("the first ticket is number one, padded in the filename", async () => {
  const dir = await initedRepo();
  const io = captureIo(dir);

  await run(["new", "Fix the login redirect"], io);

  expect(readdirSync(join(dir, ".moth"))).toEqual(["001-fix-the-login-redirect.md"]);
  const raw = readFileSync(join(dir, ".moth", "001-fix-the-login-redirect.md"), "utf8");
  expect(parseFrontmatter(raw).data.id).toBe(1);
});

test("each new ticket takes the next unused number", async () => {
  const dir = await initedRepo();

  await run(["new", "First"], captureIo(dir));
  await run(["new", "Second"], captureIo(dir));
  await run(["new", "Third"], captureIo(dir));

  expect(readdirSync(join(dir, ".moth")).sort()).toEqual([
    "001-first.md",
    "002-second.md",
    "003-third.md",
  ]);
});

test("numbering continues correctly past ninety-nine", async () => {
  const dir = await initedRepo();
  writeFileSync(join(dir, ".moth", "099-existing.md"), "---\nid: 99\n---\n\n");

  await run(["new", "After ninety nine"], captureIo(dir));

  // The sorted order is the point: padding keeps 099 before 100.
  expect(readdirSync(join(dir, ".moth")).sort()).toEqual([
    "099-existing.md",
    "100-after-ninety-nine.md",
  ]);
});

test("creating a ticket with no title fails and writes nothing", async () => {
  const dir = await initedRepo();
  const io = captureIo(dir);

  const code = await run(["new"], io);

  expect(code).toBe(2);
  expect(io.err().toLowerCase()).toContain("title");
  expect(io.out()).toBe("");
  expect(readdirSync(join(dir, ".moth"))).toHaveLength(0);
});

test("a title of only whitespace is rejected the same way", async () => {
  const dir = await initedRepo();
  const io = captureIo(dir);

  const code = await run(["new", "   "], io);

  expect(code).toBe(2);
  expect(io.err().toLowerCase()).toContain("title");
  expect(readdirSync(join(dir, ".moth"))).toHaveLength(0);
});
