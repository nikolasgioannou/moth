import { parseArgs } from "../args.ts";
import { legalFields } from "../config.ts";
import type { Io } from "../io.ts";
import { categoryLookup, FILTER_OPTIONS, filterTickets, statusOrder } from "../query.ts";
import { openRepo } from "../repo.ts";
import { blockingView, duplicateIds, metadataOf, readTickets, validate } from "../ticket.ts";

export async function list(argv: string[], io: Io): Promise<number> {
  const parsed = parseArgs(argv.slice(1), { json: { type: "boolean" }, ...FILTER_OPTIONS });
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

  const all = readTickets(ticketsDir);

  const tickets = filterTickets(all, parsed.values, config);

  for (const problem of validate(
    all,
    legalFields(config),
    config.statuses.map((entry) => entry.name),
  )) {
    io.stderr(`moth: ticket ${problem.id}: ${problem.reason}\n`);
  }

  const categoryOf = categoryLookup(config);
  const dangling = new Set<string>();
  for (const ticket of all) {
    for (const id of blockingView(all, ticket, categoryOf).dangling) dangling.add(id);
  }
  if (dangling.size > 0) {
    const missing = [...dangling].sort().join(", ");
    io.stderr(`moth: blocked_by names tickets that do not exist: ${missing}\n`);
  }

  const duplicates = duplicateIds(all);
  if (duplicates.length > 0) {
    const list = duplicates.join(", ");
    io.stderr(`moth: duplicate ticket ids: ${list}\n`);
  }

  if (parsed.values.json === true) {
    // Bodies are omitted; a survey of the store should not carry every description.
    const summaries = tickets.map(metadataOf);
    io.stdout(`${JSON.stringify(summaries, null, 2)}\n`);
    return 0;
  }

  if (tickets.length === 0) {
    // An empty store and a filter that matched nothing are different situations,
    // and saying the first when the second is true is actively misleading.
    io.stdout(
      all.length === 0
        ? "No tickets yet. Create one with 'moth new \"a title\"'.\n"
        : "No tickets match those filters.\n",
    );
    return 0;
  }

  // Padding is applied before colour so the zero-width escapes never skew a column.
  const paint = (code: string, text: string) => (io.isTty ? `\x1b[${code}m${text}\x1b[0m` : text);

  // Widths are computed across the whole result, so columns line up between groups too.
  const idWidth = Math.max(...tickets.map((t) => t.id.length));
  const titleWidth = Math.max(...tickets.map((ticket) => ticket.title.length));

  for (const status of statusOrder(config, tickets)) {
    const group = tickets.filter((ticket) => ticket.status === status);
    if (group.length === 0) continue;
    io.stdout(`${paint("1", status)}\n`);
    for (const ticket of group) {
      const id = ticket.id.padEnd(idWidth);
      const title = ticket.title.padEnd(titleWidth);
      const parent = ticket.parent === undefined ? "" : paint("2", `  \u21b3 ${ticket.parent}`);
      io.stdout(`  ${paint("2", id)}  ${title}  ${paint("2", ticket.priority)}${parent}\n`);
    }
    io.stdout("\n");
  }

  return 0;
}
