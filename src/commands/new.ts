import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { parseArgs } from "../args.ts";
import { type Config, readConfig } from "../config.ts";
import type { Io } from "../io.ts";
import { formatId, nextNumber, padNumber } from "../ticket.ts";

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

export async function create(argv: string[], io: Io): Promise<number> {
  const parsed = parseArgs(argv.slice(1), {
    json: { type: "boolean" },
    body: { type: "string" },
    "body-file": { type: "string" },
  });
  if (!parsed.ok) {
    io.stderr(`moth: ${parsed.message}\n`);
    return 2;
  }
  const { values, positionals } = parsed;

  const mothDir = join(io.cwd, ".moth");
  if (!existsSync(join(mothDir, "config.yml"))) {
    io.stderr("moth: not a moth repo, run 'moth init' first\n");
    return 1;
  }

  const config = readConfig(mothDir);
  const ticketsDir = join(mothDir, "tickets");
  const title = positionals[0] ?? "";

  const id = nextNumber(ticketsDir);
  const padded = padNumber(id);

  const slug = slugify(title);
  const filename = slug === "" ? `${padded}.md` : `${padded}-${slug}.md`;
  const timestamp = io.now().toISOString();

  const metadata = {
    id,
    title,
    status: defaultStatus(config),
    priority: "none",
    created_at: timestamp,
    updated_at: timestamp,
  };

  const bodyFile = values["body-file"];
  let body = typeof values.body === "string" ? values.body : "";
  if (bodyFile === "-") {
    body = (await io.stdin()).replace(/\n+$/, "");
  } else if (typeof bodyFile === "string") {
    body = readFileSync(join(io.cwd, bodyFile), "utf8").replace(/\n+$/, "");
  }

  const document = `---\n${stringifyYaml(metadata)}---\n\n${body === "" ? "" : `${body}\n`}`;
  writeFileSync(join(ticketsDir, filename), document);

  if (values.json === true) {
    io.stdout(`${JSON.stringify({ ...metadata, body }, null, 2)}\n`);
  } else {
    io.stdout(`${formatId(id, config.prefix)}  ${title}\n`);
  }
  return 0;
}
