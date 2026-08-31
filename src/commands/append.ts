import { parseArgs } from "../args.ts";

import type { Io } from "../io.ts";
import { openRepo } from "../repo.ts";
import { readTickets, resolve, saveTicket } from "../ticket.ts";

const NOTES_HEADING = "## Notes";

export async function append(argv: string[], io: Io): Promise<number> {
  const parsed = parseArgs(argv.slice(1), {});
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
  const { ticketsDir } = opened.repo;

  const reference = parsed.positionals[0] ?? "";
  const found = resolve(readTickets(ticketsDir), reference);
  if (found.kind !== "found") {
    io.stderr(`moth: no single ticket matches '${reference}'\n`);
    return 1;
  }

  const note = (await io.stdin()).replace(/\n+$/, "");
  if (note === "") {
    io.stderr("moth: nothing to append; pipe the note in on stdin\n");
    return 2;
  }

  const ticket = found.ticket;
  const existing = ticket.body.replace(/\n+$/, "");
  const heading = existing.includes(NOTES_HEADING) ? "" : `\n${NOTES_HEADING}\n`;
  const body = `${existing}\n${heading}\n${note}\n`;

  saveTicket({ ...ticket, body, updated_at: io.now().toISOString() });
  io.stdout(`${ticket.id}  ${ticket.title}\n`);
  return 0;
}
