import { parseArgs } from "../args.ts";

import type { Io } from "../io.ts";
import { openRepo } from "../repo.ts";
import { formatId, metadataOf, readTickets, resolve, writeTicket } from "../ticket.ts";

export async function move(argv: string[], io: Io): Promise<number> {
  const parsed = parseArgs(argv.slice(1), { json: { type: "boolean" } });
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

  const [reference = "", status = ""] = parsed.positionals;
  const found = resolve(readTickets(ticketsDir), reference, config.prefix);

  if (found.kind === "none") {
    io.stderr(`moth: no ticket matches '${reference}'\n`);
    return 1;
  }
  if (found.kind === "ambiguous") {
    io.stderr(`moth: '${reference}' is ambiguous, it matches:\n`);
    for (const candidate of found.tickets) {
      io.stderr(`  ${formatId(candidate.id, config.prefix)}  ${candidate.title}\n`);
    }
    return 1;
  }

  const legal = config.statuses.map((entry) => entry.name);
  if (!legal.includes(status)) {
    io.stderr(
      `moth: '${status}' is not a status in this repo. Legal statuses: ${legal.join(", ")}\n`,
    );
    return 1;
  }

  const ticket = found.ticket;
  // A move to the status a ticket already holds is a no-op, not an error:
  // agents retry, and a retry should not look like a failure or touch the file.
  const updated =
    ticket.status === status ? ticket : { ...ticket, status, updated_at: io.now().toISOString() };
  if (updated !== ticket) writeTicket(updated);

  if (parsed.values.json === true) {
    io.stdout(`${JSON.stringify(metadataOf(updated), null, 2)}\n`);
  } else {
    io.stdout(`${formatId(updated.id, config.prefix)}  ${updated.title}  ${updated.status}\n`);
  }
  return 0;
}
