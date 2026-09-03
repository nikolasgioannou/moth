import { openCommand } from "../command.ts";
import type { Io } from "../io.ts";
import { FILTER_OPTIONS, filterTickets, statusOrder } from "../query.ts";
import { readTickets } from "../ticket.ts";

export async function board(argv: string[], io: Io): Promise<number> {
  const opened = openCommand(argv, io, FILTER_OPTIONS);
  if (!opened.ok) return opened.code;
  const { config, ticketsDir, values } = opened;

  const all = readTickets(ticketsDir);
  const tickets = filterTickets(all, values, config);

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
