import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { Scalar, stringify as stringifyYaml } from "yaml";
import { stringList } from "../args.ts";
import { suppliedBody } from "../body.ts";
import { openCommand, resolveOrReport } from "../command.ts";
import { type Config, PRIORITIES } from "../config.ts";
import type { Io } from "../io.ts";
import { allocateId, filenameFor, readTickets } from "../ticket.ts";

/** New tickets open in the first status belonging to the backlog category. */
function defaultStatus(config: Config): string {
  const status = config.statuses.find((entry) => entry.category === "backlog");
  return status?.name ?? config.statuses[0]?.name ?? "backlog";
}

export async function create(argv: string[], io: Io): Promise<number> {
  const opened = openCommand(argv, io, {
    json: { type: "boolean" },
    body: { type: "string" },
    "body-file": { type: "string" },
    priority: { type: "string" },
    label: { type: "string", multiple: true },
    parent: { type: "string" },
  });
  if (!opened.ok) return opened.code;
  const { config, ticketsDir, values, positionals } = opened;

  const title = (positionals[0] ?? "").trim();
  if (title === "") {
    io.stderr('moth: a ticket needs a title, as in: moth new "Fix the login redirect"\n');
    return 2;
  }

  const existing = readTickets(ticketsDir);
  let parentId: string | undefined;
  if (typeof values.parent === "string") {
    const parent = resolveOrReport(existing, values.parent, io, "parent");
    if (parent === null) return 1;
    parentId = parent.id;
  }

  const priority = typeof values.priority === "string" ? values.priority : "none";
  if (!(PRIORITIES as readonly string[]).includes(priority)) {
    io.stderr(`moth: '${priority}' is not a priority. Legal values: ${PRIORITIES.join(", ")}\n`);
    return 1;
  }
  const labels = [...new Set(stringList(values.label))].sort();

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
    priority,
    labels,
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
