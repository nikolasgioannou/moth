import { openCommand, resolveOrReport } from "../command.ts";
import type { Io } from "../io.ts";
import { blocks, metadataOf, readTickets } from "../ticket.ts";

export async function show(argv: string[], io: Io): Promise<number> {
  const opened = openCommand(argv, io, { json: { type: "boolean" } });
  if (!opened.ok) return opened.code;
  const { ticketsDir, positionals, values } = opened;

  const tickets = readTickets(ticketsDir);
  const ticket = resolveOrReport(tickets, positionals[0] ?? "", io);
  if (ticket === null) return 1;

  if (values.json === true) {
    io.stdout(`${JSON.stringify({ ...metadataOf(ticket), body: ticket.body }, null, 2)}\n`);
    return 0;
  }
  io.stdout(`${ticket.id}  ${ticket.title}\n`);
  io.stdout(`status    ${ticket.status}\n`);
  io.stdout(`priority  ${ticket.priority}\n`);
  if (ticket.labels.length > 0) io.stdout(`labels    ${ticket.labels.join(", ")}\n`);
  if (ticket.blocked_by !== undefined && ticket.blocked_by.length > 0) {
    io.stdout(`blocked by ${ticket.blocked_by.join(", ")}\n`);
  }
  const blocking = blocks(tickets, ticket);
  if (blocking.length > 0) io.stdout(`blocks    ${blocking.join(", ")}\n`);
  io.stdout(`created   ${ticket.created_at}\n`);
  io.stdout(`updated   ${ticket.updated_at}\n`);
  if (ticket.body !== "") io.stdout(`\n${ticket.body}`);
  return 0;
}
