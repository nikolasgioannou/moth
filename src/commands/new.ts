import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { Scalar, stringify as stringifyYaml } from "yaml";
import { parseArgs } from "../args.ts";
import { suppliedBody } from "../body.ts";
import type { Config } from "../config.ts";
import type { Io } from "../io.ts";
import { openRepo } from "../repo.ts";
import { allocateId, filenameFor, readTickets, resolve } from "../ticket.ts";

/** New tickets open in the first status belonging to the backlog category. */
function defaultStatus(config: Config): string {
  const status = config.statuses.find((entry) => entry.category === "backlog");
  return status?.name ?? config.statuses[0]?.name ?? "backlog";
}

export async function create(argv: string[], io: Io): Promise<number> {
  const parsed = parseArgs(argv.slice(1), {
    json: { type: "boolean" },
    body: { type: "string" },
    "body-file": { type: "string" },
    parent: { type: "string" },
  });
  if (!parsed.ok) {
    io.stderr(`moth: ${parsed.message}\n`);
    return 2;
  }
  const { values, positionals } = parsed;

  const opened = openRepo(io.cwd);
  if (!opened.ok) {
    io.stderr(`moth: ${opened.message}
`);
    return 1;
  }
  const { config, ticketsDir } = opened.repo;

  const title = (positionals[0] ?? "").trim();
  if (title === "") {
    io.stderr('moth: a ticket needs a title, as in: moth new "Fix the login redirect"\n');
    return 2;
  }

  const existing = readTickets(ticketsDir);
  let parentId: string | undefined;
  if (typeof values.parent === "string") {
    const parentRef = resolve(existing, values.parent);
    if (parentRef.kind !== "found") {
      io.stderr(`moth: no single ticket matches parent '${values.parent}'\n`);
      return 1;
    }
    parentId = parentRef.ticket.id;
  }

  const id = allocateId(io, existing);
  if (id === null) {
    io.stderr("moth: could not allocate a free ticket id\n");
    return 1;
  }
  const filename = filenameFor(id, title);
  const timestamp = io.now().toISOString();

  const metadata = {
    id,
    title,
    status: defaultStatus(config),
    priority: "none",
    labels: [] as string[],
    ...(parentId === undefined ? {} : { parent: parentId }),
    created_at: timestamp,
    updated_at: timestamp,
  };

  const supplied = await suppliedBody(values, io);
  if (!supplied.ok) {
    io.stderr(`moth: ${supplied.message}\n`);
    return 1;
  }
  const body = supplied.body ?? "";

  // Quoted so no YAML parser can read an id like 22739e as a number.
  const quotedId = new Scalar(id);
  quotedId.type = Scalar.QUOTE_DOUBLE;
  const document = `---\n${stringifyYaml({ ...metadata, id: quotedId })}---\n\n${body === "" ? "" : `${body}\n`}`;
  writeFileSync(join(ticketsDir, filename), document);

  if (values.json === true) {
    io.stdout(`${JSON.stringify({ ...metadata, body }, null, 2)}\n`);
  } else {
    io.stdout(`${id}  ${title}\n`);
  }
  return 0;
}
