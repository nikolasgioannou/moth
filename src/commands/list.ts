import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs, stringList } from "../args.ts";
import { readConfig } from "../config.ts";
import type { Io } from "../io.ts";
import {
  blockingView,
  duplicateNumbers,
  formatId,
  metadataOf,
  padNumber,
  readTickets,
} from "../ticket.ts";

export async function list(argv: string[], io: Io): Promise<number> {
  const parsed = parseArgs(argv.slice(1), {
    json: { type: "boolean" },
    status: { type: "string" },
    category: { type: "string" },
    priority: { type: "string" },
    label: { type: "string", multiple: true },
    search: { type: "string" },
    blocked: { type: "boolean" },
    unblocked: { type: "boolean" },
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

  const config = readConfig(mothDir);
  const all = readTickets(join(mothDir, "tickets"));

  // A ticket's category is looked up through config, so a query by category
  // is portable across repos that name their statuses differently.
  const categoryOf = (status: string) =>
    config.statuses.find((entry) => entry.name === status)?.category;

  const values = parsed.values;
  const wantedLabels = stringList(values.label);
  const search = typeof values.search === "string" ? values.search.toLowerCase() : undefined;

  const dangling = new Set<number>();
  for (const ticket of all) {
    for (const id of blockingView(all, ticket, categoryOf).dangling) dangling.add(id);
  }
  if (dangling.size > 0) {
    const missing = [...dangling]
      .sort((a, b) => a - b)
      .map(padNumber)
      .join(", ");
    io.stderr(`moth: blocked_by names tickets that do not exist: ${missing}\n`);
  }

  const tickets = all.filter((ticket) => {
    if (typeof values.status === "string" && ticket.status !== values.status) return false;
    if (typeof values.category === "string" && categoryOf(ticket.status) !== values.category) {
      return false;
    }
    if (typeof values.priority === "string" && ticket.priority !== values.priority) return false;
    if (!wantedLabels.every((label) => ticket.labels.includes(label))) return false;
    if (values.blocked === true || values.unblocked === true) {
      const isBlocked = blockingView(all, ticket, categoryOf).open.length > 0;
      if (values.blocked === true && !isBlocked) return false;
      if (values.unblocked === true && isBlocked) return false;
    }
    if (search !== undefined) {
      const haystack = `${ticket.title}\n${ticket.body}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  const duplicates = duplicateNumbers(all);
  if (duplicates.length > 0) {
    const list = duplicates.map(padNumber).join(", ");
    io.stderr(`moth: duplicate ticket numbers: ${list}\n`);
  }

  if (parsed.values.json === true) {
    // Bodies are omitted; a survey of the store should not carry every description.
    const summaries = tickets.map(metadataOf);
    io.stdout(`${JSON.stringify(summaries, null, 2)}\n`);
    return 0;
  }

  if (tickets.length === 0) {
    io.stdout("No tickets yet. Create one with 'moth new \"a title\"'.\n");
    return 0;
  }

  // Config order first, then any status the config no longer declares.
  const declared = config.statuses.map((entry) => entry.name);
  const extra = [...new Set(tickets.map((t) => t.status))].filter((s) => !declared.includes(s));

  // Padding is applied before colour so the zero-width escapes never skew a column.
  const paint = (code: string, text: string) => (io.isTty ? `\x1b[${code}m${text}\x1b[0m` : text);

  // Widths are computed across the whole store, so columns line up between groups too.
  const idWidth = Math.max(...tickets.map((t) => formatId(t.id, config.prefix).length));
  const titleWidth = Math.max(...tickets.map((ticket) => ticket.title.length));

  for (const status of [...declared, ...extra]) {
    const group = tickets.filter((ticket) => ticket.status === status);
    if (group.length === 0) continue;
    io.stdout(`${paint("1", status)}\n`);
    for (const ticket of group) {
      const id = formatId(ticket.id, config.prefix).padEnd(idWidth);
      const title = ticket.title.padEnd(titleWidth);
      const parent =
        ticket.parent === undefined ? "" : paint("2", `  \u21b3 ${padNumber(ticket.parent)}`);
      io.stdout(`  ${paint("2", id)}  ${title}  ${paint("2", ticket.priority)}${parent}\n`);
    }
    io.stdout("\n");
  }

  return 0;
}
