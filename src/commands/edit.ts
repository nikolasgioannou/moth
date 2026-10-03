import { stringList } from "../args.ts";
import { APPEND, suppliedBody } from "../body.ts";
import { mergeLabels, openCommand, priorityOrReport, resolveOrReport } from "../command.ts";
import { legalFields } from "../config.ts";
import type { Io } from "../io.ts";
import { metadataOf, parentProblem, readTickets, saveTicket } from "../ticket.ts";

export async function edit(argv: string[], io: Io): Promise<number> {
  const opened = openCommand(argv, io, {
    json: { type: "boolean" },
    title: { type: "string" },
    body: { type: "string" },
    "body-file": { type: "string" },
    "append-body": { type: "string" },
    "append-body-file": { type: "string" },
    priority: { type: "string" },
    label: { type: "string", multiple: true },
    "remove-label": { type: "string", multiple: true },
    parent: { type: "string" },
    "blocked-by": { type: "string", multiple: true },
    unblock: { type: "string", multiple: true },
    set: { type: "string", multiple: true },
  });
  if (!opened.ok) return opened.code;
  const { config, ticketsDir, positionals, values } = opened;

  const reference = positionals[0] ?? "";
  const all = readTickets(ticketsDir);
  const ticket = resolveOrReport(all, reference, io);
  if (ticket === null) return 1;

  const title = typeof values.title === "string" ? values.title.trim() : ticket.title;
  if (title === "") {
    io.stderr("moth: a ticket needs a title, so it cannot be cleared\n");
    return 2;
  }

  const supplied = await suppliedBody(values, io);
  if (!supplied.ok) {
    io.stderr(`moth: ${supplied.message}\n`);
    return 1;
  }
  const appended = await suppliedBody(values, io, APPEND);
  if (!appended.ok) {
    io.stderr(`moth: ${appended.message}\n`);
    return 1;
  }
  if (supplied.body !== undefined && appended.body !== undefined) {
    io.stderr("moth: replace the body or append to it, not both\n");
    return 2;
  }
  // Appended text is added verbatim after one blank line. moth adds no heading:
  // the body has no schema, so how it is organised is the caller's to decide.
  const existing = ticket.body.replace(/\n+$/, "");
  const body =
    appended.body === undefined
      ? (supplied.body ?? ticket.body)
      : existing === ""
        ? appended.body
        : `${existing}\n\n${appended.body}`;

  const priority = priorityOrReport(values, io, ticket.priority);
  if (priority === null) return 2;

  let parent = ticket.parent;
  if (typeof values.parent === "string" && values.parent.trim().toLowerCase() === "none") {
    parent = undefined;
  } else if (typeof values.parent === "string") {
    const candidate = resolveOrReport(all, values.parent, io, "parent");
    if (candidate === null) return 1;
    const problem = parentProblem(all, ticket, candidate.id);
    if (problem !== null) {
      io.stderr(`moth: ${problem.reason}\n`);
      return 1;
    }
    parent = candidate.id;
  }

  const toIds = (references: string[]): string[] | null => {
    const ids: string[] = [];
    for (const reference of references) {
      const match = resolveOrReport(all, reference, io, "blocker");
      if (match === null) return null;
      ids.push(match.id);
    }
    return ids;
  };

  // A blocker being removed is looked for among this ticket's own blockers
  // first, so one whose ticket no longer exists can still be removed.
  const toRemovedIds = (references: string[]): string[] | null => {
    const ids: string[] = [];
    for (const reference of references) {
      const wanted = reference.trim().toLowerCase();
      const own = (ticket.blocked_by ?? []).filter((id) => id.startsWith(wanted));
      if (own.length === 1 && own[0] !== undefined) {
        ids.push(own[0]);
        continue;
      }
      const match = resolveOrReport(all, reference, io, "blocker");
      if (match === null) return null;
      ids.push(match.id);
    }
    return ids;
  };

  const addedBlockers = toIds(stringList(values["blocked-by"]));
  const removedBlockers = toRemovedIds(stringList(values.unblock));
  if (addedBlockers === null || removedBlockers === null) return 1;
  const blockedBy = [...new Set([...(ticket.blocked_by ?? []), ...addedBlockers])]
    .filter((id) => !removedBlockers.includes(id))
    .sort();

  const custom: Record<string, string> = {};
  for (const assignment of stringList(values.set)) {
    const [key = "", ...rest] = assignment.split("=");
    // The body is the document, not a frontmatter key. Without this a repo that
    // declares `body` as a field could --set one that collides with it.
    if (key === "body") {
      io.stderr("moth: the body is not a frontmatter field; use --body or --body-file\n");
      return 2;
    }
    if (!legalFields(config).includes(key)) {
      io.stderr(`moth: '${key}' is not a field in this repo. Declare it in config to use it.\n`);
      return 1;
    }
    custom[key] = rest.join("=");
  }

  const labels = mergeLabels(values, ticket.labels);

  // Compared with trailing newlines stripped: the stored body always ends with
  // one, while a supplied body never does.
  const trimmed = (text: string) => text.replace(/\n+$/, "");
  const changed =
    trimmed(body) !== trimmed(ticket.body) ||
    title !== ticket.title ||
    priority !== ticket.priority ||
    parent !== ticket.parent ||
    Object.keys(custom).length > 0 ||
    blockedBy.join(",") !== (ticket.blocked_by ?? []).join(",") ||
    labels.join("\u0000") !== ticket.labels.join("\u0000");
  const updated = changed
    ? saveTicket({
        ...ticket,
        ...custom,
        title,
        body,
        priority,
        labels,
        parent,
        // Undefined rather than omitted: `...ticket` already carries the old list,
        // so leaving the key out would keep a blocker that was just removed.
        blocked_by: blockedBy.length === 0 ? undefined : blockedBy,
        updated_at: io.now().toISOString(),
      })
    : ticket;

  if (values.json === true) {
    io.stdout(`${JSON.stringify(metadataOf(updated), null, 2)}\n`);
  } else {
    io.stdout(`${updated.id}  ${updated.title}\n`);
  }
  return 0;
}
