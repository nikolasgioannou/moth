import { parseArgs } from "../args.ts";

import type { Io } from "../io.ts";
import { FILTER_OPTIONS, filterTickets, statusOrder } from "../query.ts";
import { openRepo } from "../repo.ts";
import { readTickets } from "../ticket.ts";

export async function board(argv: string[], io: Io): Promise<number> {
  const parsed = parseArgs(argv.slice(1), FILTER_OPTIONS);
  if (!parsed.ok) {
    io.stderr(`moth: ${parsed.message}\n`);
    return 2;
  }

  const opened = openRepo(io.cwd);
  if (!opened.ok) {
    io.stderr(`moth: ${opened.message}
`);
    return 1;
  }
  const { config, ticketsDir } = opened.repo;

  const all = readTickets(ticketsDir);
  const tickets = filterTickets(all, parsed.values, config);

  io.stdout("# Tickets\n");
  for (const status of statusOrder(config, tickets)) {
    const group = tickets.filter((ticket) => ticket.status === status);
    if (group.length === 0) continue;
    io.stdout(`\n## ${status}\n\n`);
    for (const ticket of group) {
      const priority = ticket.priority === "none" ? "" : ` _(${ticket.priority})_`;
      io.stdout(`- **${ticket.id}** ${ticket.title}${priority}\n`);
    }
  }
  return 0;
}
