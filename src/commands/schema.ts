import { openCommand } from "../command.ts";
import { CATEGORIES, CORE_FIELDS, PRIORITIES } from "../config.ts";
import type { Io } from "../io.ts";

/**
 * Everything an agent needs to construct a valid ticket without reading config
 * by hand, or guessing at what this repo happens to call its statuses.
 */
export async function schema(argv: string[], io: Io): Promise<number> {
  const opened = openCommand(argv, io, { json: { type: "boolean" } });
  if (!opened.ok) return opened.code;
  const { config } = opened;

  const document = {
    categories: CATEGORIES.map((entry) => entry.category),
    statuses: config.statuses,
    priorities: PRIORITIES,
    fields: { core: CORE_FIELDS, custom: config.fields ?? [] },
  };

  io.stdout(`${JSON.stringify(document, null, 2)}\n`);
  return 0;
}
