import { afterAll, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pkg from "../package.json";
import { SKILL_PATH } from "../scripts/release.ts";
import { HELP } from "../src/help.ts";
import { COMMAND_LIST, run } from "../src/run.ts";
import { captureIo } from "./helpers/capture-io.ts";
import { initedRepo } from "./helpers/repo-fixture.ts";
import { cleanupTempDirs, tempDir } from "./helpers/tmp.ts";

afterAll(cleanupTempDirs);

const installed = (base: string, where: string) => join(base, where, "moth-method", "SKILL.md");

test("installing for agents puts the skill in each one's directory in the repo", async () => {
  const dir = await initedRepo();
  const io = captureIo(dir);

  expect(await run(["skill", "install", "--agent", "claude,codex"], io)).toBe(0);

  expect(existsSync(installed(dir, ".claude/skills"))).toBe(true);
  expect(existsSync(installed(dir, ".agents/skills"))).toBe(true);
  expect(io.out()).toContain(`installed moth-method ${pkg.version}`);
});

test("installing again says it updated, and stamps the running version", async () => {
  const dir = await initedRepo();
  await run(["skill", "install", "--agent", "claude"], captureIo(dir));
  const io = captureIo(dir);

  await run(["skill", "install", "--agent", "claude"], io);

  expect(io.out()).toContain("updated moth-method");
  expect(readFileSync(installed(dir, ".claude/skills"), "utf8")).toContain(
    `moth-version: "${pkg.version}"`,
  );
});

test("a global install goes under home, in each agent's own directory", async () => {
  const dir = await initedRepo();
  const home = tempDir();

  await run(
    ["skill", "install", "--agent", "claude", "--agent", "cursor", "--global"],
    captureIo(dir, { home }),
  );

  expect(existsSync(installed(home, ".claude/skills"))).toBe(true);
  expect(existsSync(installed(home, ".cursor/skills"))).toBe(true);
  expect(existsSync(join(dir, ".claude"))).toBe(false);
});

test("a global install and a printed skill need no moth repo", async () => {
  const dir = tempDir();
  const home = tempDir();

  expect(
    await run(["skill", "install", "--agent", "claude", "--global"], captureIo(dir, { home })),
  ).toBe(0);
  const io = captureIo(dir);
  expect(await run(["skill", "print"], io)).toBe(0);
  expect(io.out()).toStartWith("---\nname: moth-method\n");
});

test("a repo install outside a moth repo says how to proceed", async () => {
  const io = captureIo(tempDir());

  expect(await run(["skill", "install", "--agent", "claude"], io)).toBe(1);
  expect(io.err()).toContain("--global");
});

test("--dir installs anywhere", async () => {
  const dir = tempDir();

  expect(await run(["skill", "install", "--dir", "vendor/skills"], captureIo(dir))).toBe(0);
  expect(existsSync(installed(dir, "vendor/skills"))).toBe(true);
});

test("at a terminal with no flags it asks which agents and where", async () => {
  const dir = await initedRepo();
  const home = tempDir();
  const io = captureIo(dir, { home, isTty: true, answers: ["claude, codex", "global"] });

  expect(await run(["skill", "install"], io)).toBe(0);

  expect(io.asked().map((entry) => entry.defaultValue)).toEqual(["claude", "repo"]);
  expect(existsSync(installed(home, ".claude/skills"))).toBe(true);
  expect(existsSync(installed(home, ".codex/skills"))).toBe(true);
});

test("without a terminal or flags it refuses rather than guessing", async () => {
  const io = captureIo(await initedRepo());

  expect(await run(["skill", "install"], io)).toBe(2);
  expect(io.err()).toContain("--agent");
});

test("an unknown agent is a usage error naming the choices", async () => {
  const io = captureIo(await initedRepo());

  expect(await run(["skill", "install", "--agent", "emacs"], io)).toBe(2);
  expect(io.err()).toContain("claude, codex, cursor");
});

// The method names commands and flags, so a rename that forgot it would teach
// every agent that loads it something false. Every `moth <command> --flag` in
// its code must exist in that command's help.
test("every command and flag the Moth Method names exists", () => {
  const text = readFileSync(SKILL_PATH, "utf8");
  const code = [
    ...[...text.matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map((match) => match[1] ?? ""),
    ...[...text.matchAll(/`([^`\n]+)`/g)].map((match) => match[1] ?? ""),
  ];
  const named: string[] = [];
  for (const block of code) {
    for (const line of block.split("\n")) {
      const call = line.match(/\bmoth ([a-z]+)(.*)/);
      if (call === null) continue;
      const [, command = "", rest = ""] = call;
      named.push(command);
      expect(COMMAND_LIST.concat("help")).toContain(command);
      // board and stats document their filters by pointing at list's.
      const own = HELP[command]?.usage ?? "";
      const usage = own.includes("same filters as list") ? `${own} ${HELP.list?.usage}` : own;
      for (const flag of rest.split("#")[0]?.match(/--[a-z][a-z-]*/g) ?? []) {
        expect(`${command} ${usage}`).toContain(flag);
      }
    }
  }
  // Guards the guard: if the extraction broke, nothing above would be checked.
  expect(named.length).toBeGreaterThan(15);
});

test("the Moth Method in the repo declares the version being released", () => {
  expect(readFileSync(SKILL_PATH, "utf8")).toContain(`moth-version: "${pkg.version}"`);
});
