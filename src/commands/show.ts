import { parseArgs } from "../args.ts";

import type { Io } from "../io.ts";
import { openRepo } from "../repo.ts";
import { blocks, formatId, metadataOf, padNumber, readTickets, resolve } from "../ticket.ts";

export async function show(argv: string[], io: Io): Promise<number> {
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

  const reference = parsed.positionals[0] ?? "";
  const tickets = readTickets(ticketsDir);
  const found = resolve(tickets, reference, config.prefix);

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

  const { ticket } = found;

  if (parsed.values.json === true) {
    io.stdout(`${JSON.stringify({ ...metadataOf(ticket), body: ticket.body }, null, 2)}\n`);
    return 0;
  }
  io.stdout(`${formatId(ticket.id, config.prefix)}  ${ticket.title}\n`);
  io.stdout(`status    ${ticket.status}\n`);
  io.stdout(`priority  ${ticket.priority}\n`);
  if (ticket.labels.length > 0) io.stdout(`labels    ${ticket.labels.join(", ")}\n`);
  if (ticket.blocked_by !== undefined && ticket.blocked_by.length > 0) {
    io.stdout(`blocked by ${ticket.blocked_by.map(padNumber).join(", ")}\n`);
  }
  const blocking = blocks(tickets, ticket);
  if (blocking.length > 0) io.stdout(`blocks    ${blocking.map(padNumber).join(", ")}\n`);
  io.stdout(`created   ${ticket.created_at}\n`);
  io.stdout(`updated   ${ticket.updated_at}\n`);
  if (ticket.body !== "") io.stdout(`\n${ticket.body}`);
  return 0;
}
