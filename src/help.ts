interface CommandHelp {
  /** One line, shown in the command list. */
  summary: string;
  usage: string;
  /** A worked example with realistic values, not placeholders. */
  example: string;
  notes?: string;
}

export const HELP: Record<string, CommandHelp> = {
  init: {
    summary: "Set up moth in this repository",
    usage: "moth init",
    example: `  $ moth init
  Statuses in 'backlog' [backlog]:
  ...
  Writes moth.config.yml and creates the ticket directory.`,
    notes:
      "The only command that asks questions. Running it again leaves an existing config alone.",
  },
  new: {
    summary: "File a ticket",
    usage: 'moth new "<title>" [--body <text> | --body-file <path>] [--parent <ticket>] [--json]',
    example: `  $ moth new "Fix the login redirect"
  001  Fix the login redirect

  $ printf 'Loops on a stale cookie.\\n' | moth new "Stale session" --body-file -`,
    notes:
      "A title is required. Use --body-file - to pipe markdown in without shell quoting mangling it.",
  },
  list: {
    summary: "List tickets, grouped by status",
    usage:
      "moth list [--status <s>] [--category <c>] [--priority <p>] [--label <l>] [--search <text>] [--blocked | --unblocked] [--json]",
    example: `  $ moth list --category started
  $ moth list --label cli --priority high --json`,
    notes: "Filters combine. --category works in any repo; --status uses this repo's own names.",
  },
  show: {
    summary: "Show one ticket",
    usage: "moth show <ticket> [--json]",
    example: `  $ moth show 20
  $ moth show "login redirect"`,
    notes: "A ticket is named by its number, padded or not, or by words from its title.",
  },
  move: {
    summary: "Put a ticket in another status",
    usage: "moth move <ticket> <status> [--json]",
    example: `  $ moth move 20 in-progress`,
    notes: "Moving to the status a ticket already holds succeeds and changes nothing.",
  },
  edit: {
    summary: "Change a ticket's title, priority, labels, parent or blockers",
    usage:
      "moth edit <ticket> [--title <text>] [--priority <p>] [--label <l>] [--remove-label <l>] [--parent <ticket>] [--blocked-by <ticket>] [--unblock <ticket>] [--set <field>=<value>] [--json]",
    example: `  $ moth edit 20 --priority high --label cli
  $ moth edit 20 --title "Rewrite the auth flow"
  $ moth edit 21 --blocked-by 20`,
    notes:
      "Changing a title renames the file to match. --set only accepts fields declared in config.",
  },
  append: {
    summary: "Add a note to a ticket from stdin",
    usage: "moth append <ticket>",
    example: `  $ printf 'Reproduced on Safari.\\n' | moth append 20`,
    notes: "Notes accumulate under a Notes heading; the description above is left alone.",
  },
  delete: {
    summary: "Remove a ticket permanently",
    usage: "moth delete <ticket> --yes",
    example: `  $ moth delete 20 --yes`,
    notes:
      "For mistakes only. To record that work will not be done, move it to a cancelled status instead and keep its history. Never prompts, so --yes is required.",
  },
  board: {
    summary: "Print a markdown board",
    usage: "moth board [same filters as list]",
    example: `  $ moth board > BOARD.md
  $ moth board --category started`,
    notes: "Writes nothing itself; redirect it if you want the board committed.",
  },
  check: {
    summary: "Report problems with the tickets on disk",
    usage: "moth check [--fix]",
    example: `  $ moth check
  $ moth check --fix`,
    notes:
      "Also available as 'moth doctor'. --fix repairs what it can and reports what it left alone.",
  },
  schema: {
    summary: "Print what this repo considers a legal ticket",
    usage: "moth schema [--json]",
    example: `  $ moth schema --json`,
    notes:
      "Every legal field, status with its category, and priority. Read this before writing a ticket.",
  },
};

export const COMMAND_NAMES = Object.keys(HELP);

/** Other names a command answers to. They share the command's help. */
export const ALIASES: Record<string, string> = { doctor: "check" };

/** The command a name refers to, following an alias if it is one. */
export function resolveCommandName(name: string): string {
  return ALIASES[name] ?? name;
}

const EXIT_CODES = `Exit codes:
  0  the command succeeded
  1  the command ran but could not do what was asked
  2  usage error: the arguments were wrong
`;

export function topLevelHelp(version: string): string {
  const width = Math.max(...COMMAND_NAMES.map((name) => name.length));
  const commands = COMMAND_NAMES.map(
    (name) => `  ${name.padEnd(width)}  ${HELP[name]?.summary ?? ""}`,
  ).join("\n");
  return `moth ${version} — an issue tracker that lives in your repository.

Usage: moth <command> [options]

Commands:
${commands}

Run 'moth <command> --help' for a command's options and a worked example.

${EXIT_CODES}`;
}

export function commandHelp(name: string): string | null {
  const resolved = resolveCommandName(name);
  const entry = HELP[resolved];
  if (entry === undefined) return null;
  const notes = entry.notes === undefined ? "" : `\n${entry.notes}\n`;
  return `moth ${resolved} — ${entry.summary}

Usage: ${entry.usage}
${notes}
Example:
${entry.example}

${EXIT_CODES}`;
}
