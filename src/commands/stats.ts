import { openCommand } from "../command.ts";
import type { Io } from "../io.ts";
import { FILTER_OPTIONS, filterOrReport, statusOrder } from "../query.ts";
import { readTickets } from "../ticket.ts";

export async function stats(argv: string[], io: Io): Promise<number> {
  const opened = openCommand(argv, io, { json: { type: "boolean" }, ...FILTER_OPTIONS });
  if (!opened.ok) return opened.code;
  const { config, ticketsDir, values } = opened;

  const tickets = filterOrReport(readTickets(ticketsDir), values, config, io);
  if (tickets === null) return 1;

  // Every declared status appears, at zero if need be, so a count of nothing
  // left to do reads as an answer rather than as a status that went missing.
  const counts = statusOrder(config, tickets).map((status) => ({
    status,
    count: tickets.filter((ticket) => ticket.status === status).length,
  }));

  if (values.json === true) {
    const statuses = Object.fromEntries(counts.map(({ status, count }) => [status, count]));
    io.stdout(`${JSON.stringify({ total: tickets.length, statuses }, null, 2)}\n`);
    return 0;
  }
  io.stdout(`${counts.map(({ status, count }) => `${status} ${count}`).join(" · ")}\n`);
  return 0;
}
