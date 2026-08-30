import { rmSync } from "node:fs";
import { parseArgs } from "../args.ts";

import type { Io } from "../io.ts";
import { openRepo } from "../repo.ts";
import { formatId, readTickets, resolve } from "../ticket.ts";

const HELP = `moth delete <ticket> --yes

Removes a ticket's file permanently. This is for mistakes: to record that
work will not be done, cancel it instead, which keeps the ticket and its
history.

  --yes    Required. Deleting never prompts, so an agent cannot delete by
           accident and a script cannot hang waiting on a confirmation.
`;

export async function remove(argv: string[], io: Io): Promise<number> {
  const parsed = parseArgs(argv.slice(1), {
    yes: { type: "boolean" },
    help: { type: "boolean" },
  });
  if (!parsed.ok) {
    io.stderr(`moth: ${parsed.message}\n`);
    return 2;
  }
  if (parsed.values.help === true) {
    io.stdout(HELP);
    return 0;
  }

  const opened = openRepo(io.cwd);
  if (!opened.ok) {
    io.stderr(`moth: ${opened.message}
`);
    return 1;
  }
  const { config, ticketsDir } = opened.repo;

  const reference = parsed.positionals[0] ?? "";
  const found = resolve(readTickets(ticketsDir), reference, config.prefix);
  if (found.kind !== "found") {
    io.stderr(`moth: no single ticket matches '${reference}'\n`);
    return 1;
  }

  if (parsed.values.yes !== true) {
    io.stderr("moth: deleting is permanent, pass --yes to confirm. To record that work\n");
    io.stderr("      will not be done, cancel the ticket instead and keep its history.\n");
    return 2;
  }

  const ticket = found.ticket;
  rmSync(ticket.path);
  io.stdout(`deleted ${formatId(ticket.id, config.prefix)}  ${ticket.title}\n`);
  return 0;
}
