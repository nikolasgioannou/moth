import { rmSync } from "node:fs";
import { openCommand, resolveOrReport } from "../command.ts";
import type { Io } from "../io.ts";
import { readTickets } from "../ticket.ts";

export async function remove(argv: string[], io: Io): Promise<number> {
  const opened = openCommand(argv, io, {
    yes: { type: "boolean" },
  });
  if (!opened.ok) return opened.code;
  const { ticketsDir, positionals, values } = opened;

  const ticket = resolveOrReport(readTickets(ticketsDir), positionals[0] ?? "", io);
  if (ticket === null) return 1;

  if (values.yes !== true) {
    io.stderr("moth: deleting is permanent, pass --yes to confirm. To record that work\n");
    io.stderr("      will not be done, cancel the ticket instead and keep its history.\n");
    return 2;
  }

  rmSync(ticket.path);
  io.stdout(`deleted ${ticket.id}  ${ticket.title}\n`);
  return 0;
}
