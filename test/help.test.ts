import { afterAll, expect, test } from "bun:test";
import { COMMAND_NAMES } from "../src/help.ts";
import { COMMAND_LIST, run } from "../src/run.ts";
import { captureIo } from "./helpers/capture-io.ts";
import { cleanupTempDirs, tempDir } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

async function help(...args: string[]): Promise<string> {
  const io = captureIo(tempDir());
  const code = await run(args, io);
  expect(code).toBe(0);
  expect(io.err()).toBe("");
  return io.out();
}

test("top-level help lists every command with a one-line description", async () => {
  const out = await help("--help");

  for (const name of COMMAND_NAMES) {
    expect(out).toContain(name);
  }
  // each listed command is followed by prose on the same line
  for (const line of out.split("\n").filter((l) => /^\s{2}\w/.test(l))) {
    expect(line.trim().split(/\s{2,}/).length).toBeGreaterThan(1);
  }
});

test("help documents what each exit code means", async () => {
  const out = await help("--help");

  expect(out).toContain("0");
  expect(out).toContain("1");
  expect(out).toContain("2");
  expect(out.toLowerCase()).toContain("usage error");
});

test("every command has help carrying a worked example", async () => {
  for (const name of COMMAND_NAMES) {
    const out = await help(name, "--help");
    expect(out).toContain(name);
    expect(out.toLowerCase()).toContain("example");
    // a worked example invokes moth with realistic arguments
    expect(out).toMatch(new RegExp(`moth ${name}[^\\n]*\\S`));
  }
});

test("help is reachable as a bare command and as a flag", async () => {
  expect(await help("help")).toContain("moth");
  expect(await help("-h")).toContain("moth");
  expect(await help("new", "-h")).toContain("moth new");
});

test("the dispatch table and the help registry name exactly the same commands", async () => {
  // A command that dispatches but has no help entry exits 2 on --help, which is
  // how `moth doctor --help` once failed. Comparing both ways catches either drift.
  expect([...COMMAND_LIST].sort()).toEqual([...COMMAND_NAMES].sort());
});
