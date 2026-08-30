import { afterAll, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "../test/frontmatter.ts";
import { captureIo } from "../test/io.ts";
import { initedRepo } from "../test/repo.ts";
import { cleanupTempDirs, tempDir } from "../test/tmp.ts";
import { run } from "./run.ts";

afterAll(cleanupTempDirs);

test("new writes exactly one ticket file", async () => {
  const dir = await initedRepo();
  const io = captureIo(dir);

  const code = await run(["new", "Fix the login redirect"], io);

  expect(code).toBe(0);
  expect(readdirSync(join(dir, ".moth", "tickets"))).toHaveLength(1);
});

test("new outside an initialised repo fails and names init as the fix", async () => {
  const dir = tempDir();
  const io = captureIo(dir);

  const code = await run(["new", "Something"], io);

  expect(code).toBe(1);
  expect(io.err()).toContain("init");
  expect(io.out()).toBe("");
});

test("the ticket id uses the configured prefix", async () => {
  const dir = await initedRepo({ prefix: "ENG" });
  const io = captureIo(dir);

  await run(["new", "Fix the login redirect"], io);

  const [file] = readdirSync(join(dir, ".moth", "tickets"));
  expect(file).toMatch(/^ENG-[0-9a-f]{4}/);
});

test("a colliding id is regenerated rather than overwriting an existing ticket", async () => {
  const dir = await initedRepo({ prefix: "ENG" });
  const suffixes = ["aaaa", "aaaa", "bbbb"];
  let next = 0;
  const io = captureIo(dir, { randomHex: () => suffixes[next++] ?? "cccc" });

  await run(["new", "First"], io);
  await run(["new", "Second"], io);

  expect(readdirSync(join(dir, ".moth", "tickets")).sort()).toEqual([
    "ENG-aaaa-first.md",
    "ENG-bbbb-second.md",
  ]);
});

test("the filename carries the id and a slug from the title", async () => {
  const dir = await initedRepo({ prefix: "ENG" });
  const io = captureIo(dir, { randomHex: () => "7f3a" });

  await run(["new", "Fix the login redirect!"], io);

  expect(readdirSync(join(dir, ".moth", "tickets"))).toEqual([
    "ENG-7f3a-fix-the-login-redirect.md",
  ]);
});

test("the ticket records its metadata in frontmatter", async () => {
  const dir = await initedRepo({ prefix: "ENG" });
  const io = captureIo(dir, {
    randomHex: () => "7f3a",
    now: () => new Date("2026-08-30T12:00:00.000Z"),
  });

  await run(["new", "Fix the login redirect"], io);

  const raw = readFileSync(
    join(dir, ".moth", "tickets", "ENG-7f3a-fix-the-login-redirect.md"),
    "utf8",
  );
  expect(parseFrontmatter(raw).data).toEqual({
    id: "ENG-7f3a",
    title: "Fix the login redirect",
    status: "backlog",
    priority: "none",
    created_at: "2026-08-30T12:00:00.000Z",
    updated_at: "2026-08-30T12:00:00.000Z",
  });
});

test("a new ticket opens in the repo's own backlog status", async () => {
  const dir = tempDir();
  await run(["init"], captureIo(dir, { answers: ["ENG", "icebox"] }));
  const io = captureIo(dir, { randomHex: () => "7f3a" });

  await run(["new", "Something"], io);

  const raw = readFileSync(join(dir, ".moth", "tickets", "ENG-7f3a-something.md"), "utf8");
  expect(parseFrontmatter(raw).data.status).toBe("icebox");
});

test("new accepts a description from a flag", async () => {
  const dir = await initedRepo({ prefix: "ENG" });
  const io = captureIo(dir, { randomHex: () => "7f3a" });

  await run(["new", "Something", "--body", "The description."], io);

  const raw = readFileSync(join(dir, ".moth", "tickets", "ENG-7f3a-something.md"), "utf8");
  expect(parseFrontmatter(raw).body).toBe("The description.\n");
});

test("a piped description survives quotes, backticks and code fences intact", async () => {
  const dir = await initedRepo({ prefix: "ENG" });
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
  const io = captureIo(dir, { randomHex: () => "7f3a", stdin: description });

  await run(["new", "Stale token", "--body-file", "-"], io);

  const raw = readFileSync(join(dir, ".moth", "tickets", "ENG-7f3a-stale-token.md"), "utf8");
  expect(parseFrontmatter(raw).body).toBe(`${description}\n`);
});

test("new prints the ticket it created", async () => {
  const dir = await initedRepo({ prefix: "ENG" });
  const io = captureIo(dir, { randomHex: () => "7f3a" });

  await run(["new", "Fix the login redirect"], io);

  expect(io.out()).toContain("ENG-7f3a");
  expect(io.out()).toContain("Fix the login redirect");
  expect(io.err()).toBe("");
});

test("new emits the created ticket as json on request", async () => {
  const dir = await initedRepo({ prefix: "ENG" });
  const io = captureIo(dir, {
    randomHex: () => "7f3a",
    now: () => new Date("2026-08-30T12:00:00.000Z"),
  });

  await run(["new", "Fix the login redirect", "--json", "--body", "Details."], io);

  expect(JSON.parse(io.out())).toEqual({
    id: "ENG-7f3a",
    title: "Fix the login redirect",
    status: "backlog",
    priority: "none",
    created_at: "2026-08-30T12:00:00.000Z",
    updated_at: "2026-08-30T12:00:00.000Z",
    body: "Details.",
  });
});
