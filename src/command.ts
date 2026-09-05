import { type OptionSpec, parseArgs, stringList } from "./args.ts";
import { type Config, PRIORITIES } from "./config.ts";
import type { Io } from "./io.ts";
import { openRepo } from "./repo.ts";
import { resolve, type Ticket } from "./ticket.ts";

type Values = Record<string, string | boolean | (string | boolean)[] | undefined>;

export type Opened =
  | { ok: true; values: Values; positionals: string[]; config: Config; ticketsDir: string }
  | { ok: false; code: number };

/**
 * The two things every command does before it can do its own work: parse its
 * arguments and find the repo. Both failures are reported here, so the exit
 * codes stay consistent — 2 when the caller wrote the command wrong, 1 when the
 * command was fine but could not run.
 *
 * `init` is the one command that does not use this, because it runs where no
 * repo exists yet.
 */
export function openCommand(argv: string[], io: Io, options: OptionSpec = {}): Opened {
  const parsed = parseArgs(argv.slice(1), options);
  if (!parsed.ok) {
    io.stderr(`moth: ${parsed.message}\n`);
    return { ok: false, code: 2 };
  }

  const opened = openRepo(io.cwd);
  if (!opened.ok) {
    io.stderr(`moth: ${opened.message}\n`);
    return { ok: false, code: 1 };
  }

  return {
    ok: true,
    values: parsed.values,
    positionals: parsed.positionals,
    config: opened.repo.config,
    ticketsDir: opened.repo.ticketsDir,
  };
}

/**
 * Finds the one ticket a reference names, reporting the failure itself and
 * returning null when it has. Callers do `if (ticket === null) return 1`.
 *
 * An ambiguous reference always lists the candidates, whatever the reference is
 * for. That used to depend on the call site: the primary argument listed them,
 * while a parent or blocker got a single flat line, and `moth delete` — the one
 * destructive command — was on the wrong side of that split. Naming the role
 * rather than branching on it means a reference cannot be resolved unhelpfully.
 */
export function resolveOrReport(
  tickets: Ticket[],
  reference: string,
  io: Io,
  role = "ticket",
): Ticket | null {
  const found = resolve(tickets, reference);

  if (found.kind === "none") {
    io.stderr(`moth: no ${role} matches '${reference}'\n`);
    return null;
  }
  if (found.kind === "ambiguous") {
    io.stderr(`moth: '${reference}' is ambiguous, it matches:\n`);
    for (const candidate of found.tickets) {
      io.stderr(`  ${candidate.id}  ${candidate.title}\n`);
    }
    return null;
  }
  return found.ticket;
}

/**
 * The priority a caller asked for, or null when they named one that does not
 * exist — reported here, so both commands refuse the same value with the same
 * sentence. Absent means `fallback`, which is "none" on a new ticket and the
 * ticket's own priority on an edit.
 */
export function priorityOrReport(values: Values, io: Io, fallback: string): string | null {
  const priority = typeof values.priority === "string" ? values.priority : fallback;
  if (!(PRIORITIES as readonly string[]).includes(priority)) {
    io.stderr(`moth: '${priority}' is not a priority. Legal values: ${PRIORITIES.join(", ")}\n`);
    return null;
  }
  return priority;
}

/**
 * The labels a ticket ends up with: what it had, plus --label, minus
 * --remove-label. Deduplicated and sorted, so a ticket's labels do not depend on
 * which command wrote them or in what order they were given.
 */
export function mergeLabels(values: Values, existing: readonly string[] = []): string[] {
  const added = stringList(values.label);
  const removed = stringList(values["remove-label"]);
  return [...new Set([...existing, ...added])].filter((label) => !removed.includes(label)).sort();
}
