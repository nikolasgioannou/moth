import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { parseArgs } from "../args.ts";
import { CATEGORIES } from "../config.ts";
import type { Io } from "../io.ts";
import { CONFIG_FILENAME, DEFAULT_TICKETS_DIR } from "../repo.ts";

const CONFIG_HEADER = `# moth configuration.
#
# prefix    Optional. Shown before a ticket's number, e.g. ENG-001. Empty for
#           bare numbers, which is the default.
# tickets   Directory the tickets live in, relative to this file.
# statuses  Each status belongs to one of six fixed categories:
#           backlog, unstarted, started, completed, canceled, duplicate.
#           Add your own statuses here; the categories cannot change.

`;

export async function init(argv: string[], io: Io): Promise<number> {
  const parsed = parseArgs(argv.slice(1), {});
  if (!parsed.ok) {
    io.stderr(`moth: ${parsed.message}\n`);
    return 2;
  }

  const configPath = join(io.cwd, CONFIG_FILENAME);

  if (existsSync(configPath)) {
    io.stdout("moth: already initialised, leaving the existing config alone\n");
    return 0;
  }

  const statuses: { name: string; category: string }[] = [];
  for (const { category, defaultStatus } of CATEGORIES) {
    const answer = await io.prompt(`Statuses in '${category}'`, defaultStatus);
    for (const name of answer.split(",")) {
      const trimmed = name.trim();
      if (trimmed !== "") statuses.push({ name: trimmed, category });
    }
  }

  mkdirSync(join(io.cwd, DEFAULT_TICKETS_DIR), { recursive: true });
  writeFileSync(
    configPath,
    CONFIG_HEADER + stringifyYaml({ prefix: "", tickets: DEFAULT_TICKETS_DIR, statuses }),
  );
  return 0;
}
