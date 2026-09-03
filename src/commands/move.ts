import { openCommand, resolveOrReport } from "../command.ts";
import type { Io } from "../io.ts";
import { metadataOf, readTickets, writeTicket } from "../ticket.ts";

export async function move(argv: string[], io: Io): Promise<number> {
  const opened = openCommand(argv, io, { json: { type: "boolean" } });
  if (!opened.ok) return opened.code;
  const { config, ticketsDir, positionals, values } = opened;

  const [reference = "", status = ""] = positionals;
  const ticket = resolveOrReport(readTickets(ticketsDir), reference, io);
  if (ticket === null) return 1;

  const legal = config.statuses.map((entry) => entry.name);
  if (!legal.includes(status)) {
    io.stderr(
      `moth: '${status}' is not a status in this repo. Legal statuses: ${legal.join(", ")}\n`,
    );
    return 1;
  }

  // A move to the status a ticket already holds is a no-op, not an error:
  // agents retry, and a retry should not look like a failure or touch the file.
  const updated =
    ticket.status === status ? ticket : { ...ticket, status, updated_at: io.now().toISOString() };
  if (updated !== ticket) writeTicket(updated);

  if (values.json === true) {
    io.stdout(`${JSON.stringify(metadataOf(updated), null, 2)}\n`);
  } else {
    io.stdout(`${updated.id}  ${updated.title}  ${updated.status}\n`);
  }
  return 0;
}
