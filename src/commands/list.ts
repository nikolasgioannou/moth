import { existsSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "../args.ts";
import { readConfig } from "../config.ts";
import type { Io } from "../io.ts";
import { readTickets } from "../ticket.ts";

export async function list(argv: string[], io: Io): Promise<number> {
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

  const config = readConfig(mothDir);
  const tickets = readTickets(join(mothDir, "tickets"));

  if (parsed.values.json === true) {
    // Bodies are omitted; a survey of the store should not carry every description.
    const summaries = tickets.map(({ body: _body, ...rest }) => rest);
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
  const idWidth = Math.max(...tickets.map((ticket) => ticket.id.length));
  const titleWidth = Math.max(...tickets.map((ticket) => ticket.title.length));

  for (const status of [...declared, ...extra]) {
    const group = tickets.filter((ticket) => ticket.status === status);
    if (group.length === 0) continue;
    io.stdout(`${paint("1", status)}\n`);
    for (const ticket of group) {
      const id = ticket.id.padEnd(idWidth);
      const title = ticket.title.padEnd(titleWidth);
      io.stdout(`  ${paint("2", id)}  ${title}  ${paint("2", ticket.priority)}\n`);
    }
    io.stdout("\n");
  }

  return 0;
}
