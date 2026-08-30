import { afterAll, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseFrontmatter } from "../test/frontmatter.ts";
import { captureIo } from "../test/io.ts";
import { initedRepo } from "../test/repo.ts";
import { cleanupTempDirs } from "../test/tmp.ts";
import { run } from "./run.ts";

afterAll(cleanupTempDirs);

const files = (dir: string) => readdirSync(join(dir, ".moth")).sort();
const read = (dir: string, name: string) =>
  parseFrontmatter(readFileSync(join(dir, ".moth", name), "utf8"));

test("changing a title renames the file and keeps the number", async () => {
  const dir = await initedRepo();
  await run(["new", "Fix login redirect", "--body", "Stale cookie."], captureIo(dir));
  const io = captureIo(dir);

  const code = await run(["edit", "1", "--title", "Rewrite the auth flow"], io);

  expect(code).toBe(0);
  expect(files(dir)).toEqual(["001-rewrite-the-auth-flow.md"]);
  const parsed = read(dir, "001-rewrite-the-auth-flow.md");
  expect(parsed.data.id).toBe(1);
  expect(parsed.data.title).toBe("Rewrite the auth flow");
  expect(parsed.body).toBe("Stale cookie.\n");
});

test("priority is settable to a legal value", async () => {
  const dir = await initedRepo();
  await run(["new", "Fix login redirect"], captureIo(dir));
  const io = captureIo(dir);

  expect(await run(["edit", "1", "--priority", "high"], io)).toBe(0);
  expect(read(dir, "001-fix-login-redirect.md").data.priority).toBe("high");
});

test("an illegal priority is refused, with the legal values listed", async () => {
  const dir = await initedRepo();
  await run(["new", "Fix login redirect"], captureIo(dir));
  const io = captureIo(dir);

  const code = await run(["edit", "1", "--priority", "critical"], io);

  expect(code).toBe(1);
  expect(io.err()).toContain("critical");
  expect(io.err()).toContain("urgent");
  expect(read(dir, "001-fix-login-redirect.md").data.priority).toBe("none");
});

test("labels are free-form, and can be added and removed", async () => {
  const dir = await initedRepo();
  await run(["new", "Fix login redirect"], captureIo(dir));

  await run(["edit", "1", "--label", "cli", "--label", "auth/session"], captureIo(dir));
  expect(read(dir, "001-fix-login-redirect.md").data.labels).toEqual(["auth/session", "cli"]);

  await run(["edit", "1", "--remove-label", "cli"], captureIo(dir));
  expect(read(dir, "001-fix-login-redirect.md").data.labels).toEqual(["auth/session"]);
});

test("a title cannot be cleared", async () => {
  const dir = await initedRepo();
  await run(["new", "Fix login redirect"], captureIo(dir));
  const io = captureIo(dir);

  const code = await run(["edit", "1", "--title", "   "], io);

  expect(code).toBe(2);
  expect(io.err().toLowerCase()).toContain("title");
  expect(files(dir)).toEqual(["001-fix-login-redirect.md"]);
});

test("edit prints the ticket it updated", async () => {
  const dir = await initedRepo();
  await run(["new", "Fix login redirect"], captureIo(dir));
  const io = captureIo(dir);

  await run(["edit", "1", "--priority", "high"], io);

  expect(io.out()).toContain("001");
  expect(io.out()).toContain("Fix login redirect");
});

test("setting a value that is already set changes nothing and succeeds", async () => {
  const dir = await initedRepo();
  await run(["new", "Fix login redirect"], captureIo(dir));
  await run(["edit", "1", "--priority", "high"], captureIo(dir));
  const before = readFileSync(join(dir, ".moth", "001-fix-login-redirect.md"), "utf8");
  const io = captureIo(dir, { now: () => new Date("2030-01-01T00:00:00.000Z") });

  const code = await run(["edit", "1", "--priority", "high"], io);

  expect(code).toBe(0);
  expect(readFileSync(join(dir, ".moth", "001-fix-login-redirect.md"), "utf8")).toBe(before);
});

test("a real edit touches the updated timestamp and not the created one", async () => {
  const dir = await initedRepo();
  const created = "2026-01-01T00:00:00.000Z";
  await run(["new", "Fix login redirect"], captureIo(dir, { now: () => new Date(created) }));
  const edited = "2026-06-15T12:00:00.000Z";

  await run(["edit", "1", "--priority", "high"], captureIo(dir, { now: () => new Date(edited) }));

  const data = read(dir, "001-fix-login-redirect.md").data;
  expect(data.created_at).toBe(created);
  expect(data.updated_at).toBe(edited);
});
