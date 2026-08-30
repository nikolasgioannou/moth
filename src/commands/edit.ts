import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs, stringList } from "../args.ts";
import { PRIORITIES, readConfig } from "../config.ts";
import type { Io } from "../io.ts";
import {
  formatId,
  metadataOf,
  parentProblem,
  readTickets,
  resolve,
  saveTicket,
} from "../ticket.ts";

export async function edit(argv: string[], io: Io): Promise<number> {
  const parsed = parseArgs(argv.slice(1), {
    json: { type: "boolean" },
    title: { type: "string" },
    priority: { type: "string" },
    label: { type: "string", multiple: true },
    "remove-label": { type: "string", multiple: true },
    parent: { type: "string" },
  });
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

  const ticket = found.ticket;
  const values = parsed.values;

  const title = typeof values.title === "string" ? values.title.trim() : ticket.title;
  if (title === "") {
    io.stderr("moth: a ticket needs a title, so it cannot be cleared\n");
    return 2;
  }

  const priority = typeof values.priority === "string" ? values.priority : ticket.priority;
  if (!(PRIORITIES as readonly string[]).includes(priority)) {
    io.stderr(`moth: '${priority}' is not a priority. Legal values: ${PRIORITIES.join(", ")}\n`);
    return 1;
  }

  const all = readTickets(join(mothDir, "tickets"));
  let parent = ticket.parent;
  if (typeof values.parent === "string") {
    const parentRef = resolve(all, values.parent, config.prefix);
    if (parentRef.kind !== "found") {
      io.stderr(`moth: no single ticket matches parent '${values.parent}'\n`);
      return 1;
    }
    const problem = parentProblem(all, ticket, parentRef.ticket.id);
    if (problem !== null) {
      io.stderr(`moth: ${problem.reason}\n`);
      return 1;
    }
    parent = parentRef.ticket.id;
  }

  const added = stringList(values.label);
  const removed = stringList(values["remove-label"]);
  const labels = [...new Set([...ticket.labels, ...added])]
    .filter((label) => !removed.includes(label))
    .sort();

  const changed =
    title !== ticket.title ||
    priority !== ticket.priority ||
    parent !== ticket.parent ||
    labels.join("\u0000") !== ticket.labels.join("\u0000");
  const updated = changed
    ? saveTicket({ ...ticket, title, priority, labels, parent, updated_at: io.now().toISOString() })
    : ticket;

  if (parsed.values.json === true) {
    io.stdout(`${JSON.stringify(metadataOf(updated), null, 2)}\n`);
  } else {
    io.stdout(`${formatId(updated.id, config.prefix)}  ${updated.title}\n`);
  }
  return 0;
}
