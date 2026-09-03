import { afterAll, expect, test } from "bun:test";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { run } from "../src/run.ts";
import { captureIo } from "./helpers/capture-io.ts";
import { parseFrontmatter } from "./helpers/frontmatter.ts";
import { initedRepo } from "./helpers/repo-fixture.ts";
import { newTicket, ticketText } from "./helpers/tickets.ts";
import { cleanupTempDirs, tempDir } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

const files = (dir: string) => readdirSync(join(dir, ".moth")).sort();
const fields = (dir: string, id: string) => parseFrontmatter(ticketText(dir, id)).data;

test("changing a title renames the file and keeps the id", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix login redirect", ["--body", "Stale cookie."]);
  const io = captureIo(dir);

  const code = await run(["edit", id, "--title", "Rewrite the auth flow"], io);

  expect(code).toBe(0);
  expect(files(dir)).toEqual([`rewrite-the-auth-flow-${id}.md`]);
  const parsed = parseFrontmatter(ticketText(dir, id));
  expect(parsed.data.id).toBe(id);
  expect(parsed.data.title).toBe("Rewrite the auth flow");
  expect(parsed.body).toBe("Stale cookie.\n");
});

test("priority is settable to a legal value", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix login redirect");

  expect(await run(["edit", id, "--priority", "high"], captureIo(dir))).toBe(0);
  expect(fields(dir, id).priority).toBe("high");
});

test("an illegal priority is refused, with the legal values listed", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix login redirect");
  const io = captureIo(dir);

  const code = await run(["edit", id, "--priority", "critical"], io);

  expect(code).toBe(1);
  expect(io.err()).toContain("critical");
  expect(io.err()).toContain("urgent");
  expect(fields(dir, id).priority).toBe("none");
});

test("labels are free-form, and can be added and removed", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix login redirect");

  await run(["edit", id, "--label", "cli", "--label", "auth/session"], captureIo(dir));
  expect(fields(dir, id).labels).toEqual(["auth/session", "cli"]);

  await run(["edit", id, "--remove-label", "cli"], captureIo(dir));
  expect(fields(dir, id).labels).toEqual(["auth/session"]);
});

test("a title cannot be cleared", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix login redirect");
  const io = captureIo(dir);

  const code = await run(["edit", id, "--title", "   "], io);

  expect(code).toBe(2);
  expect(io.err().toLowerCase()).toContain("title");
  expect(files(dir)).toEqual([`fix-login-redirect-${id}.md`]);
});

test("edit prints the ticket it updated", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix login redirect");
  const io = captureIo(dir);

  await run(["edit", id, "--priority", "high"], io);

  expect(io.out()).toContain(id);
  expect(io.out()).toContain("Fix login redirect");
});

test("setting a value that is already set changes nothing and succeeds", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix login redirect");
  await run(["edit", id, "--priority", "high"], captureIo(dir));
  const before = ticketText(dir, id);
  const io = captureIo(dir, { now: () => new Date("2030-01-01T00:00:00.000Z") });

  const code = await run(["edit", id, "--priority", "high"], io);

  expect(code).toBe(0);
  expect(ticketText(dir, id)).toBe(before);
});

test("a real edit touches the updated timestamp and not the created one", async () => {
  const dir = await initedRepo();
  const created = "2026-01-01T00:00:00.000Z";
  const id = await newTicket(dir, "Fix login redirect", [], { now: () => new Date(created) });
  const edited = "2026-06-15T12:00:00.000Z";

  await run(["edit", id, "--priority", "high"], captureIo(dir, { now: () => new Date(edited) }));

  expect(fields(dir, id).created_at).toBe(created);
  expect(fields(dir, id).updated_at).toBe(edited);
});

test("--body replaces the body and leaves the metadata alone", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix login redirect", ["--body", "The original description."]);

  const code = await run(["edit", id, "--body", "A wholly new description."], captureIo(dir));

  expect(code).toBe(0);
  const parsed = parseFrontmatter(ticketText(dir, id));
  expect(parsed.body).toBe("A wholly new description.\n");
  expect(parsed.data.title).toBe("Fix login redirect");
});

test("--body-file - replaces the body from stdin", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix login redirect", ["--body", "Original."]);
  const io = captureIo(dir, { stdin: "Piped in." });

  const code = await run(["edit", id, "--body-file", "-"], io);

  expect(code).toBe(0);
  expect(parseFrontmatter(ticketText(dir, id)).body).toBe("Piped in.\n");
});

test("--body-file reads a file relative to the working directory", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix login redirect", ["--body", "Original."]);
  writeFileSync(join(dir, "body.md"), "From a file.\n");

  const code = await run(["edit", id, "--body-file", "body.md"], captureIo(dir));

  expect(code).toBe(0);
  expect(parseFrontmatter(ticketText(dir, id)).body).toBe("From a file.\n");
});

test("markdown that could be mistaken for frontmatter survives a replacement", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix login redirect", ["--body", "Original."]);
  const body = ["A fenced block:", "", "```yaml", "title: not the title", "---", "```"].join("\n");

  await run(["edit", id, "--body-file", "-"], captureIo(dir, { stdin: body }));

  expect(parseFrontmatter(ticketText(dir, id)).body).toBe(`${body}\n`);
  expect(parseFrontmatter(ticketText(dir, id)).data.title).toBe("Fix login redirect");
});

test("the body can be cleared, unlike the title", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix login redirect", ["--body", "Original."]);

  const code = await run(["edit", id, "--body", ""], captureIo(dir));

  expect(code).toBe(0);
  expect(parseFrontmatter(ticketText(dir, id)).body).toBe("");
});

test("replacing the body touches the updated timestamp", async () => {
  const dir = await initedRepo();
  const created = "2026-01-01T00:00:00.000Z";
  const edited = "2026-06-01T00:00:00.000Z";
  const id = await newTicket(dir, "Fix login redirect", ["--body", "Original."], {
    now: () => new Date(created),
  });

  await run(["edit", id, "--body", "Replaced."], captureIo(dir, { now: () => new Date(edited) }));

  expect(fields(dir, id).updated_at).toBe(edited);
  expect(fields(dir, id).created_at).toBe(created);
});

test("re-writing the identical body changes nothing on disk", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix login redirect", ["--body", "Original."]);
  const before = ticketText(dir, id);

  const code = await run(["edit", id, "--body", "Original."], captureIo(dir));

  expect(code).toBe(0);
  expect(ticketText(dir, id)).toBe(before);
});

test("--set body= is refused, even when body is declared as a field", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix login redirect", ["--body", "Original."]);
  const path = join(dir, "moth.config.yml");
  writeFileSync(path, `${readFileSync(path, "utf8")}\nfields:\n  - body\n`);
  const io = captureIo(dir);

  const code = await run(["edit", id, "--set", "body=sneaky"], io);

  expect(code).toBe(1);
  expect(io.err()).toContain("--body");
  expect(parseFrontmatter(ticketText(dir, id)).body).toBe("Original.\n");
});

test("--body-file accepts an absolute path, not only one relative to the repo", async () => {
  const dir = await initedRepo();
  const id = await newTicket(dir, "Fix login redirect", ["--body", "Original."]);
  const outside = join(tempDir("body-source"), "body.md");
  writeFileSync(outside, "From outside the repo.\n");

  const code = await run(["edit", id, "--body-file", outside], captureIo(dir));

  expect(code).toBe(0);
  expect(parseFrontmatter(ticketText(dir, id)).body).toBe("From outside the repo.\n");
});

test("append is gone; the body is replaced through edit instead", async () => {
  const dir = await initedRepo();
  const io = captureIo(dir, { stdin: "A note." });

  const code = await run(["append", "whatever"], io);

  expect(code).toBe(2);
  expect(io.err()).toContain("append");
});
