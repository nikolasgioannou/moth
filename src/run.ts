import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import pkg from "../package.json";

export interface Io {
  cwd: string;
  stdout(text: string): void;
  stderr(text: string): void;
  prompt(question: string, defaultValue: string): Promise<string>;
  stdin(): Promise<string>;
  now(): Date;
  randomHex(bytes: number): string;
}

/** The six status categories, fixed for every repo. */
const CATEGORIES = [
  { category: "backlog", defaultStatus: "backlog" },
  { category: "unstarted", defaultStatus: "todo" },
  { category: "started", defaultStatus: "in-progress" },
  { category: "completed", defaultStatus: "done" },
  { category: "canceled", defaultStatus: "canceled" },
  { category: "duplicate", defaultStatus: "duplicate" },
] as const;

const CONFIG_HEADER = `# moth configuration.
#
# prefix    Ticket IDs are this prefix plus a random suffix, e.g. MOTH-7f3a.
# statuses  Each status belongs to one of six fixed categories:
#           backlog, unstarted, started, completed, canceled, duplicate.
#           Add your own statuses here; the categories cannot change.

`;

function defaultPrefix(cwd: string): string {
  return basename(cwd)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

interface Config {
  prefix: string;
  statuses: { name: string; category: string }[];
}

function readConfig(mothDir: string): Config {
  return Bun.YAML.parse(readFileSync(join(mothDir, "config.yml"), "utf8")) as Config;
}

function flagValue(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

/** New tickets open in the first status belonging to the backlog category. */
function defaultStatus(config: Config): string {
  const status = config.statuses.find((entry) => entry.category === "backlog");
  return status?.name ?? config.statuses[0]?.name ?? "backlog";
}

/** A readable filename fragment. Fixed at creation and never updated; the id is authoritative. */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/, "");
}

/** Draws an id that no ticket already holds. Null if the space is too crowded. */
function allocateId(io: Io, prefix: string, ticketsDir: string): string | null {
  const existing = readdirSync(ticketsDir);
  for (let attempt = 0; attempt < 100; attempt++) {
    const id = `${prefix}-${io.randomHex(2)}`;
    const taken = existing.some((file) => file === `${id}.md` || file.startsWith(`${id}-`));
    if (!taken) return id;
  }
  return null;
}

export async function run(argv: string[], io: Io): Promise<number> {
  const command = argv[0];

  if (command === "--version") {
    io.stdout(`${pkg.version}\n`);
    return 0;
  }

  if (command === "init") {
    const mothDir = join(io.cwd, ".moth");
    const configPath = join(mothDir, "config.yml");

    if (existsSync(configPath)) {
      io.stdout("moth: already initialised, leaving the existing config alone\n");
      return 0;
    }

    const prefix = await io.prompt("Ticket prefix", defaultPrefix(io.cwd));

    const statuses: { name: string; category: string }[] = [];
    for (const { category, defaultStatus } of CATEGORIES) {
      const answer = await io.prompt(`Statuses in '${category}'`, defaultStatus);
      for (const name of answer.split(",")) {
        const trimmed = name.trim();
        if (trimmed !== "") statuses.push({ name: trimmed, category });
      }
    }

    mkdirSync(join(mothDir, "tickets"), { recursive: true });
    writeFileSync(configPath, CONFIG_HEADER + stringifyYaml({ prefix, statuses }));
    return 0;
  }

  if (command === "new") {
    const mothDir = join(io.cwd, ".moth");
    if (!existsSync(join(mothDir, "config.yml"))) {
      io.stderr("moth: not a moth repo, run 'moth init' first\n");
      return 1;
    }

    const config = readConfig(mothDir);
    const ticketsDir = join(mothDir, "tickets");
    const title = argv[1] ?? "";

    const id = allocateId(io, config.prefix, ticketsDir);
    if (id === null) {
      io.stderr("moth: could not allocate a free ticket id\n");
      return 1;
    }

    const slug = slugify(title);
    const filename = slug === "" ? `${id}.md` : `${id}-${slug}.md`;
    const timestamp = io.now().toISOString();

    const metadata = {
      id,
      title,
      status: defaultStatus(config),
      priority: "none",
      created_at: timestamp,
      updated_at: timestamp,
    };

    const bodyFile = flagValue(argv, "--body-file");
    let body = flagValue(argv, "--body") ?? "";
    if (bodyFile === "-") {
      body = (await io.stdin()).replace(/\n+$/, "");
    } else if (bodyFile !== undefined) {
      body = readFileSync(join(io.cwd, bodyFile), "utf8").replace(/\n+$/, "");
    }

    const document = `---\n${stringifyYaml(metadata)}---\n\n${body === "" ? "" : `${body}\n`}`;
    writeFileSync(join(ticketsDir, filename), document);

    if (argv.includes("--json")) {
      io.stdout(`${JSON.stringify({ ...metadata, body }, null, 2)}\n`);
    } else {
      io.stdout(`${id}  ${title}\n`);
    }
    return 0;
  }

  io.stderr(`moth: unknown command '${command}'\n`);
  return 2;
}
