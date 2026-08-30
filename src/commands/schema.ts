import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "../args.ts";
import { CATEGORIES, CORE_FIELDS, PRIORITIES, readConfig } from "../config.ts";
import type { Io } from "../io.ts";

/**
 * Everything an agent needs to construct a valid ticket without reading config
 * by hand, or guessing at what this repo happens to call its statuses.
 */
export async function schema(argv: string[], io: Io): Promise<number> {
  const parsed = parseArgs(argv.slice(1), { json: { type: "boolean" } });
  if (!parsed.ok) {
    io.stderr(`moth: ${parsed.message}\n`);
    return 2;
  }

  const mothDir = join(io.cwd, ".moth");
  if (!existsSync(join(mothDir, "config.yml"))) {
    io.stderr("moth: not a moth repo, run 'moth init' first\n");
    return 1;
  }

  const config = readConfig(mothDir);
  const document = {
    prefix: config.prefix,
    categories: CATEGORIES.map((entry) => entry.category),
    statuses: config.statuses,
    priorities: PRIORITIES,
    fields: { core: CORE_FIELDS, custom: config.fields ?? [] },
  };

  io.stdout(`${JSON.stringify(document, null, 2)}\n`);
  return 0;
}
