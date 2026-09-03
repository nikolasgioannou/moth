import { afterAll, expect, test } from "bun:test";
import { run } from "../src/run.ts";
import { captureIo } from "./helpers/capture-io.ts";
import { initedRepo } from "./helpers/repo-fixture.ts";
import { newTicket } from "./helpers/tickets.ts";
import { cleanupTempDirs } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

/** Two tickets sharing a word, so any reference to it is ambiguous. */
async function twoAlike(): Promise<[string, string, string]> {
  const dir = await initedRepo();
  const parser = await newTicket(dir, "Fix the parser");
  const lexer = await newTicket(dir, "Fix the lexer");
  return [dir, parser, lexer];
}

test("delete names the candidates rather than only refusing", async () => {
  const [dir, parser, lexer] = await twoAlike();
  const io = captureIo(dir);

  const code = await run(["delete", "Fix the", "--yes"], io);

  expect(code).toBe(1);
  expect(io.err().toLowerCase()).toContain("ambiguous");
  expect(io.err()).toContain(parser);
  expect(io.err()).toContain(lexer);
});

test("an ambiguous parent names the candidates", async () => {
  const [dir, parser, lexer] = await twoAlike();
  const child = await newTicket(dir, "Something else");
  const io = captureIo(dir);

  const code = await run(["edit", child, "--parent", "Fix the"], io);

  expect(code).toBe(1);
  expect(io.err().toLowerCase()).toContain("ambiguous");
  expect(io.err()).toContain(parser);
  expect(io.err()).toContain(lexer);
});

test("an ambiguous blocker names the candidates", async () => {
  const [dir, parser, lexer] = await twoAlike();
  const blocked = await newTicket(dir, "Something else");
  const io = captureIo(dir);

  const code = await run(["edit", blocked, "--blocked-by", "Fix the"], io);

  expect(code).toBe(1);
  expect(io.err().toLowerCase()).toContain("ambiguous");
  expect(io.err()).toContain(parser);
  expect(io.err()).toContain(lexer);
});

test("an ambiguous parent on new names the candidates", async () => {
  const [dir, parser, lexer] = await twoAlike();
  const io = captureIo(dir);

  const code = await run(["new", "A child", "--parent", "Fix the"], io);

  expect(code).toBe(1);
  expect(io.err().toLowerCase()).toContain("ambiguous");
  expect(io.err()).toContain(parser);
  expect(io.err()).toContain(lexer);
});

test("a reference matching nothing says so, and says what it was looking for", async () => {
  const [dir] = await twoAlike();
  const child = await newTicket(dir, "Something else");

  const ticket = captureIo(dir);
  expect(await run(["show", "nothing-like-this"], ticket)).toBe(1);
  expect(ticket.err()).toContain("no ticket matches");

  const parent = captureIo(dir);
  expect(await run(["edit", child, "--parent", "nothing-like-this"], parent)).toBe(1);
  expect(parent.err()).toContain("no parent matches");

  const blocker = captureIo(dir);
  expect(await run(["edit", child, "--blocked-by", "nothing-like-this"], blocker)).toBe(1);
  expect(blocker.err()).toContain("no blocker matches");
});
