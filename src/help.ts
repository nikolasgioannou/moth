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
    usage:
      'moth new "<title>" [--body <text> | --body-file <path>] [--priority <p>] [--label <l>] [--parent <ticket>] [--json]',
    example: `  $ moth new "Fix the login redirect"
  a3f8c1  Fix the login redirect

  $ moth new "Ship the binary" --priority high --label release
  $ printf 'Loops on a stale cookie.\\n' | moth new "Stale session" --body-file -`,
    notes:
      "A title is required. --label may be given more than once. Use --body-file - to pipe markdown in without shell quoting mangling it.",
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
    example: `  $ moth show a3f8c1
  $ moth show "login redirect"`,
    notes:
      "A ticket is named by its id, in full or by an unambiguous leading fragment, or by words from its title.",
  },
  move: {
    summary: "Put a ticket in another status",
    usage: "moth move <ticket> <status> [--json]",
    example: `  $ moth move a3f8c1 in-progress`,
    notes: "Moving to the status a ticket already holds succeeds and changes nothing.",
  },
  edit: {
    summary: "Change a ticket's title, body, priority, labels, parent or blockers",
    usage:
      "moth edit <ticket> [--title <text>] [--body <text> | --body-file <path>] [--priority <p>] [--label <l>] [--remove-label <l>] [--parent <ticket>] [--blocked-by <ticket>] [--unblock <ticket>] [--set <field>=<value>] [--json]",
    example: `  $ moth edit a3f8c1 --priority high --label cli
  $ moth edit a3f8c1 --title "Rewrite the auth flow"
  $ moth show a3f8c1 --json | jq -r .body | sed s/foo/bar/ | moth edit a3f8c1 --body-file -`,
    notes:
      "Changing a title renames the file to match. --body replaces the whole body, so read it first with moth show --json. --set only accepts fields declared in config.",
  },
  delete: {
    summary: "Remove a ticket permanently",
    usage: "moth delete <ticket> --yes",
    example: `  $ moth delete a3f8c1 --yes`,
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
    notes: "--fix repairs what it can and reports what it left alone.",
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
  const entry = HELP[name];
  if (entry === undefined) return null;
  const notes = entry.notes === undefined ? "" : `\n${entry.notes}\n`;
  return `moth ${name} — ${entry.summary}

Usage: ${entry.usage}
${notes}
Example:
${entry.example}

${EXIT_CODES}`;
}
