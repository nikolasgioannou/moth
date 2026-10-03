import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import pkg from "../../package.json";
import method from "../../skills/moth-method/SKILL.md" with { type: "text" };
import { anyOf, parseArgs } from "../args.ts";
import type { Io } from "../io.ts";
import { findRoot } from "../repo.ts";

export const SKILL_NAME = "moth-method";

/**
 * Where each agent reads skills from, in a repo and for the whole user. Codex
 * and Cursor share `.agents/skills` within a repo, following the open Agent
 * Skills layout, but keep their own directories under home.
 */
export const AGENTS: Record<string, { repo: string; global: string }> = {
  claude: { repo: ".claude/skills", global: ".claude/skills" },
  codex: { repo: ".agents/skills", global: ".codex/skills" },
  cursor: { repo: ".agents/skills", global: ".cursor/skills" },
};

const AGENT_NAMES = Object.keys(AGENTS);

/** The skill as shipped in this binary, stamped with the version running it. */
export function skillText(): string {
  return method.replace(/^(\s*moth-version:\s*)"[^"]*"/m, `$1"${pkg.version}"`);
}

export async function skill(argv: string[], io: Io): Promise<number> {
  // Not openCommand: printing, or installing globally, needs no moth repo.
  const parsed = parseArgs(argv.slice(1), {
    agent: { type: "string", multiple: true },
    global: { type: "boolean" },
    dir: { type: "string" },
  });
  if (!parsed.ok) {
    io.stderr(`moth: ${parsed.message}\n`);
    return 2;
  }
  const { positionals, values } = parsed;

  const action = positionals[0];
  if (action === "print") {
    io.stdout(skillText());
    return 0;
  }
  if (action !== "install") {
    io.stderr("moth: say what to do with the skill: moth skill install, or moth skill print\n");
    return 2;
  }

  let agents = anyOf(values.agent);
  let global = values.global === true;
  const dir = typeof values.dir === "string" ? values.dir : undefined;

  // Asked only at a terminal, and only when no flag already says where. An
  // agent or a script never meets a prompt it cannot answer.
  if (agents.length === 0 && dir === undefined) {
    if (!io.isTty) {
      io.stderr(
        `moth: say where to install it: --agent ${AGENT_NAMES.join("|")} (repeatable), ` +
          "with --global for every repo, or --dir <path>\n",
      );
      return 2;
    }
    agents = anyOf([await io.prompt(`Agents (${AGENT_NAMES.join(", ")})`, "claude")]);
    if (!global) {
      global = (await io.prompt("Install for this repo or for every repo (repo, global)", "repo"))
        .trim()
        .toLowerCase()
        .startsWith("g");
    }
  }

  const unknown = agents.filter((agent) => !AGENT_NAMES.includes(agent));
  if (unknown.length > 0) {
    io.stderr(`moth: no agent '${unknown.join("', '")}'; choose from ${AGENT_NAMES.join(", ")}\n`);
    return 2;
  }

  const targets = new Set<string>();
  if (dir !== undefined) targets.add(resolve(io.cwd, dir));
  if (agents.length > 0) {
    // Into the repo, beside .moth, so the skill is committed with the tickets it describes.
    const base = global ? io.home : findRoot(io.cwd);
    if (base === null) {
      io.stderr("moth: not in a moth repo; run moth init first, or install with --global\n");
      return 1;
    }
    for (const agent of agents) {
      const where = AGENTS[agent];
      if (where !== undefined) targets.add(join(base, global ? where.global : where.repo));
    }
  }

  const text = skillText();
  for (const target of targets) {
    const folder = join(target, SKILL_NAME);
    const file = join(folder, "SKILL.md");
    const verb = existsSync(file) ? "updated" : "installed";
    mkdirSync(folder, { recursive: true });
    writeFileSync(file, text);
    const shown = file.startsWith(io.cwd) ? relative(io.cwd, file) : file;
    io.stdout(`${verb} ${SKILL_NAME} ${pkg.version} at ${shown}\n`);
  }
  return 0;
}
