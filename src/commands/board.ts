import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "../args.ts";
import { readConfig } from "../config.ts";
import type { Io } from "../io.ts";
import { FILTER_OPTIONS, filterTickets, statusOrder } from "../query.ts";
import { formatId, readTickets } from "../ticket.ts";

export async function board(argv: string[], io: Io): Promise<number> {
  const parsed = parseArgs(argv.slice(1), FILTER_OPTIONS);
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
  const all = readTickets(join(mothDir, "tickets"));
  const tickets = filterTickets(all, parsed.values, config);

  io.stdout("# Tickets\n");
  for (const status of statusOrder(config, tickets)) {
    const group = tickets.filter((ticket) => ticket.status === status);
    if (group.length === 0) continue;
    io.stdout(`\n## ${status}\n\n`);
    for (const ticket of group) {
      const priority = ticket.priority === "none" ? "" : ` _(${ticket.priority})_`;
      io.stdout(`- **${formatId(ticket.id, config.prefix)}** ${ticket.title}${priority}\n`);
    }
  }
  return 0;
}
