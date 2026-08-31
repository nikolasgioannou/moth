import { parseArgs, stringList } from "../args.ts";
import { legalFields, PRIORITIES } from "../config.ts";
import type { Io } from "../io.ts";
import { openRepo } from "../repo.ts";
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
    "blocked-by": { type: "string", multiple: true },
    unblock: { type: "string", multiple: true },
    set: { type: "string", multiple: true },
  });
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
  const found = resolve(readTickets(ticketsDir), reference);

  if (found.kind === "none") {
    io.stderr(`moth: no ticket matches '${reference}'\n`);
    return 1;
  }
  if (found.kind === "ambiguous") {
    io.stderr(`moth: '${reference}' is ambiguous, it matches:\n`);
    for (const candidate of found.tickets) {
      io.stderr(`  ${formatId(candidate.id)}  ${candidate.title}\n`);
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

  const all = readTickets(ticketsDir);
  let parent = ticket.parent;
  if (typeof values.parent === "string") {
    const parentRef = resolve(all, values.parent);
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

  const toNumbers = (references: string[]): number[] | null => {
    const numbers: number[] = [];
    for (const reference of references) {
      const match = resolve(all, reference);
      if (match.kind !== "found") {
        io.stderr(`moth: no single ticket matches '${reference}'\n`);
        return null;
      }
      numbers.push(match.ticket.id);
    }
    return numbers;
  };

  const addedBlockers = toNumbers(stringList(values["blocked-by"]));
  const removedBlockers = toNumbers(stringList(values.unblock));
  if (addedBlockers === null || removedBlockers === null) return 1;
  const blockedBy = [...new Set([...(ticket.blocked_by ?? []), ...addedBlockers])]
    .filter((id) => !removedBlockers.includes(id))
    .sort((a, b) => a - b);

  const custom: Record<string, string> = {};
  for (const assignment of stringList(values.set)) {
    const [key = "", ...rest] = assignment.split("=");
    if (!legalFields(config).includes(key)) {
      io.stderr(`moth: '${key}' is not a field in this repo. Declare it in config to use it.\n`);
      return 1;
    }
    custom[key] = rest.join("=");
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
    Object.keys(custom).length > 0 ||
    blockedBy.join(",") !== (ticket.blocked_by ?? []).join(",") ||
    labels.join("\u0000") !== ticket.labels.join("\u0000");
  const updated = changed
    ? saveTicket({
        ...ticket,
        ...custom,
        title,
        priority,
        labels,
        parent,
        ...(blockedBy.length === 0 ? {} : { blocked_by: blockedBy }),
        updated_at: io.now().toISOString(),
      })
    : ticket;

  if (parsed.values.json === true) {
    io.stdout(`${JSON.stringify(metadataOf(updated), null, 2)}\n`);
  } else {
    io.stdout(`${formatId(updated.id)}  ${updated.title}\n`);
  }
  return 0;
}
