import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { CATEGORIES } from "../config.ts";
import type { Io } from "../io.ts";

const CONFIG_HEADER = `# moth configuration.
#
# prefix    Ticket IDs are this prefix plus a random suffix, e.g. MOTH-7f3a.
# statuses  Each status belongs to one of six fixed categories:
#           backlog, unstarted, started, completed, canceled, duplicate.
#           Add your own statuses here; the categories cannot change.

`;

function defaultPrefix(cwd: string): string {
  return basename(cwd)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export async function init(_argv: string[], io: Io): Promise<number> {
  const mothDir = join(io.cwd, ".moth");
  const configPath = join(mothDir, "config.yml");

  if (existsSync(configPath)) {
    io.stdout("moth: already initialised, leaving the existing config alone\n");
    return 0;
  }

  const prefix = await io.prompt("Ticket prefix", defaultPrefix(io.cwd));

  const statuses: { name: string; category: string }[] = [];
  for (const { category, defaultStatus } of CATEGORIES) {
    const answer = await io.prompt(`Statuses in '${category}'`, defaultStatus);
    for (const name of answer.split(",")) {
      const trimmed = name.trim();
      if (trimmed !== "") statuses.push({ name: trimmed, category });
    }
  }

  mkdirSync(join(mothDir, "tickets"), { recursive: true });
  writeFileSync(configPath, CONFIG_HEADER + stringifyYaml({ prefix, statuses }));
  return 0;
}
