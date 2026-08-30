import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "../args.ts";
import { readConfig } from "../config.ts";
import type { Io } from "../io.ts";
import { formatId, readTickets, resolve } from "../ticket.ts";

export async function show(argv: string[], io: Io): Promise<number> {
  const parsed = parseArgs(argv.slice(1), { json: { type: "boolean" } });
  if (!parsed.ok) {
    io.stderr(`moth: ${parsed.message}\n`);
    return 2;
  }

  const mothDir = join(io.cwd, ".moth");
  if (!existsSync(join(mothDir, "config.yml"))) {
    io.stderr("moth: not a moth repo, run 'moth init' first\n");
    return 1;
  }

  const reference = parsed.positionals[0] ?? "";
  const config = readConfig(mothDir);
  const found = resolve(readTickets(join(mothDir, "tickets")), reference, config.prefix);

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
    io.stdout(`${JSON.stringify(ticket, null, 2)}\n`);
    return 0;
  }
  io.stdout(`${formatId(ticket.id, config.prefix)}  ${ticket.title}\n`);
  io.stdout(`status    ${ticket.status}\n`);
  io.stdout(`priority  ${ticket.priority}\n`);
  io.stdout(`created   ${ticket.created_at}\n`);
  io.stdout(`updated   ${ticket.updated_at}\n`);
  if (ticket.body !== "") io.stdout(`\n${ticket.body}`);
  return 0;
}
