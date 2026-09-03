import { renameSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { openCommand } from "../command.ts";
import { type Config, legalFields } from "../config.ts";
import type { Io } from "../io.ts";
import { categoryLookup } from "../query.ts";
import {
  allocateId,
  blockingView,
  duplicateIds,
  filenameFor,
  readTickets,
  saveTicket,
  type Ticket,
  validate,
} from "../ticket.ts";

interface Finding {
  message: string;
  /** Whether --fix can repair this without guessing at intent. */
  fixable: boolean;
}

function findings(tickets: Ticket[], config: Config): Finding[] {
  const found: Finding[] = [];
  const categoryOf = categoryLookup(config);

  for (const ticket of tickets) {
    const wanted = filenameFor(ticket.id, ticket.title);
    if (basename(ticket.path) !== wanted) {
      found.push({
        message: `${basename(ticket.path)} should be named ${wanted}`,
        fixable: true,
      });
    }
    for (const id of blockingView(tickets, ticket, categoryOf).dangling) {
      found.push({
        message: `ticket ${ticket.id} is blocked by ${id}, which does not exist`,
        fixable: false,
      });
    }
    if (ticket.parent !== undefined) {
      const parent = tickets.find((candidate) => candidate.id === ticket.parent);
      if (parent?.parent !== undefined) {
        found.push({
          message: `ticket ${ticket.id} nests more than one level deep`,
          fixable: false,
        });
      }
    }
  }

  for (const clashing of duplicateIds(tickets)) {
    found.push({
      message: `id ${clashing} is held by more than one ticket`,
      fixable: true,
    });
  }

  const statuses = config.statuses.map((entry) => entry.name);
  for (const problem of validate(tickets, legalFields(config), statuses)) {
    found.push({ message: `ticket ${problem.id}: ${problem.reason}`, fixable: false });
  }

  return found;
}

/** Renames the file to match its title. */
function repairFilename(ticket: Ticket): void {
  renameSync(ticket.path, join(dirname(ticket.path), filenameFor(ticket.id, ticket.title)));
}

/**
 * Resolves duplicate numbers by leaving the number with whichever ticket was
 * created first, since references made before the clash meant that one, and
 * renumbering the later arrivals. Returns what moved, so references that meant
 * the renumbered ticket can be checked by a human: which reference meant which
 * ticket is not knowable from the files.
 */
function repairDuplicates(io: Io, tickets: Ticket[]): string[] {
  const moved: string[] = [];
  for (const clashing of duplicateIds(tickets)) {
    const holders = tickets
      .filter((ticket) => ticket.id === clashing)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
    for (const later of holders.slice(1)) {
      const to = allocateId(io, tickets);
      if (to === null) continue;
      saveTicket({ ...later, id: to });
      moved.push(`${clashing} -> ${to} (${later.title})`);
    }
  }
  return moved;
}

export async function check(argv: string[], io: Io): Promise<number> {
  const opened = openCommand(argv, io, { fix: { type: "boolean" } });
  if (!opened.ok) return opened.code;
  const { config, ticketsDir, values } = opened;

  if (values.fix === true) {
    const before = readTickets(ticketsDir);
    for (const ticket of before) {
      if (basename(ticket.path) !== filenameFor(ticket.id, ticket.title)) repairFilename(ticket);
    }
    const moved = repairDuplicates(io, readTickets(ticketsDir));
    for (const entry of moved) {
      io.stdout(`moth: renumbered ${entry}; check anything that referred to it\n`);
    }
  }

  const remaining = findings(readTickets(ticketsDir), config);
  if (remaining.length === 0) {
    io.stdout("moth: no problems found\n");
    return 0;
  }

  const verb = values.fix === true ? "left alone" : "found";
  io.stderr(`moth: ${remaining.length} problem${remaining.length === 1 ? "" : "s"} ${verb}:\n`);
  for (const finding of remaining) io.stderr(`  ${finding.message}\n`);
  return 1;
}
