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
  parentCycle,
  readTickets,
  saveTicket,
  type Ticket,
  validate,
} from "../ticket.ts";

function findings(tickets: Ticket[], config: Config): string[] {
  const found: string[] = [];
  const categoryOf = categoryLookup(config);

  for (const ticket of tickets) {
    const wanted = filenameFor(ticket.id, ticket.title);
    if (basename(ticket.path) !== wanted) {
      // Usually a title changed by hand. Name the repair, and how to avoid it next time.
      found.push(
        `${basename(ticket.path)} should be named ${wanted}; run moth check --fix, ` +
          `and change titles with moth edit ${ticket.id} --title to keep them in step`,
      );
    }
    for (const id of blockingView(tickets, ticket, categoryOf).dangling) {
      // Left alone by --fix: the blocker may exist on another branch.
      found.push(
        `ticket ${ticket.id} is blocked by ${id}, which does not exist here; ` +
          `if it was deleted, run moth edit ${ticket.id} --unblock ${id}`,
      );
    }
  }

  // Each ticket on a cycle finds the same cycle, so report it once.
  const cycles = new Set<string>();
  for (const ticket of tickets) {
    const cycle = parentCycle(tickets, ticket);
    if (cycle === null) continue;
    const key = [...new Set(cycle)].sort().join(",");
    if (cycles.has(key)) continue;
    cycles.add(key);
    found.push(`parent links form a cycle: ${cycle.join(" -> ")}`);
  }

  for (const clashing of duplicateIds(tickets)) {
    found.push(
      `id ${clashing} is held by more than one ticket; moth check --fix renumbers all but the oldest`,
    );
  }

  const statuses = config.statuses.map((entry) => entry.name);
  for (const problem of validate(tickets, legalFields(config), statuses)) {
    found.push(`ticket ${problem.id}: ${problem.reason}`);
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
  for (const finding of remaining) io.stderr(`  ${finding}\n`);
  return 1;
}
