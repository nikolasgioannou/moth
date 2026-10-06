import { readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { Scalar, stringify as stringifyYaml } from "yaml";
import { REQUIRED_FIELDS } from "./config.ts";

export interface Ticket {
  /** Where the ticket is stored. Local detail, never part of output. */
  path: string;
  id: string;
  title: string;
  status: string;
  priority: string;
  labels: string[];
  parent?: string;
  blocked_by?: string[];
  created_at: string;
  updated_at: string;
  body: string;
}

function parse(raw: string, path: string): Ticket {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  const frontmatter = match?.[1];
  const body = match?.[2];
  if (frontmatter === undefined || body === undefined) {
    throw new Error("no frontmatter");
  }
  const parsed: unknown = Bun.YAML.parse(frontmatter);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("frontmatter is not a set of fields");
  }
  const data = parsed as Omit<Ticket, "body" | "path">;
  return { ...data, labels: data.labels ?? [], path, body: body.replace(/^\n/, "") };
}

const PRIORITY_ORDER = ["urgent", "high", "medium", "low", "none"];

/**
 * Most urgent first, then oldest first. Age comes from the creation timestamp:
 * a random id encodes no order, unlike the sequential numbers it replaced.
 */
function byPriorityThenAge(a: Ticket, b: Ticket): number {
  const rank = (ticket: Ticket) => {
    const index = PRIORITY_ORDER.indexOf(ticket.priority);
    return index === -1 ? PRIORITY_ORDER.length : index;
  };
  // A ticket edited by hand can be missing created_at entirely. Ordering falls
  // back to the id rather than throwing, so one malformed file cannot take down
  // every command that lists tickets; check reports it as a missing field.
  const age = (ticket: Ticket) => ticket.created_at ?? "";
  return rank(a) - rank(b) || age(a).localeCompare(age(b)) || a.id.localeCompare(b.id);
}

/** Six hex characters: short enough to read, wide enough that clashes stay rare. */
const ID_LENGTH = 6;

/** Draws an id no ticket already holds. Null when the space is somehow exhausted. */
export function allocateId(
  io: { randomHex(bytes: number): string },
  tickets: Ticket[],
): string | null {
  const taken = new Set(tickets.map((ticket) => ticket.id));
  for (let attempt = 0; attempt < 100; attempt++) {
    const id = io.randomHex(ID_LENGTH / 2).slice(0, ID_LENGTH);
    if (!taken.has(id)) return id;
  }
  return null;
}

/** A ticket file moth could not parse, and why. */
export interface Unreadable {
  file: string;
  reason: string;
}

/**
 * Every ticket on disk, and every file that could not be read as one. A file
 * with broken frontmatter is set aside rather than thrown, so one bad edit by
 * hand cannot stop every command from listing the other tickets.
 */
export function readStore(ticketsDir: string): { tickets: Ticket[]; unreadable: Unreadable[] } {
  const tickets: Ticket[] = [];
  const unreadable: Unreadable[] = [];
  for (const name of readdirSync(ticketsDir).filter((entry) => entry.endsWith(".md"))) {
    const path = join(ticketsDir, name);
    try {
      tickets.push(parse(readFileSync(path, "utf8"), path));
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      unreadable.push({ file: name, reason: reason.split("\n")[0] ?? reason });
    }
  }
  return {
    tickets: tickets.sort(byPriorityThenAge),
    unreadable: unreadable.sort((a, b) => a.file.localeCompare(b.file)),
  };
}

/** The tickets that could be read. Commands that only report problems use readStore. */
export function readTickets(ticketsDir: string): Ticket[] {
  return readStore(ticketsDir).tickets;
}

/**
 * Numbers held by more than one ticket. Two branches can each allocate the
 * same number and git will merge both files cleanly, so this is how that
 * situation surfaces rather than passing unnoticed.
 */
export function duplicateIds(tickets: Ticket[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const ticket of tickets) {
    if (seen.has(ticket.id)) duplicates.add(ticket.id);
    seen.add(ticket.id);
  }
  return [...duplicates].sort();
}

export type Resolution =
  | { kind: "found"; ticket: Ticket }
  | { kind: "ambiguous"; tickets: Ticket[] }
  | { kind: "none" };

/**
 * Finds the ticket a reference names, trying the most specific reading first:
 * the whole id, then a leading fragment of one, then words from a title. A
 * fragment that matches no id falls through to titles, because unlike the
 * numbers this replaced, a short hex string is just as likely to be prose.
 */
export function resolve(tickets: Ticket[], reference: string): Resolution {
  const wanted = reference.trim().toLowerCase();
  if (wanted === "") return { kind: "none" };

  const settle = (matches: Ticket[]): Resolution => {
    if (matches.length === 1) return { kind: "found", ticket: matches[0] as Ticket };
    return { kind: "ambiguous", tickets: matches };
  };

  const exact = tickets.filter((ticket) => ticket.id === wanted);
  if (exact.length > 0) return settle(exact);

  if (/^[0-9a-f]+$/.test(wanted)) {
    const byPrefix = tickets.filter((ticket) => ticket.id.startsWith(wanted));
    if (byPrefix.length > 0) return settle(byPrefix);
  }

  const byTitle = tickets.filter((ticket) => ticket.title.toLowerCase().includes(wanted));
  return byTitle.length === 0 ? { kind: "none" } : settle(byTitle);
}

/** A ticket's structured fields, without local storage detail or its body. */
export function metadataOf(ticket: Ticket): Omit<Ticket, "path" | "body"> {
  const { path: _path, body: _body, ...metadata } = ticket;
  return metadata;
}

/**
 * Ids are always quoted. An id like `22739e` is a plain string to one YAML
 * writer and a number to another parser, which silently loses the trailing
 * character; quoting removes the ambiguity for every reader, not just ours.
 */
function quoted(value: string): Scalar {
  const scalar = new Scalar(value);
  scalar.type = Scalar.QUOTE_DOUBLE;
  return scalar;
}

/** Every frontmatter field that holds an id, and so must survive a round trip. */
const ID_FIELDS = ["id", "parent"] as const;

/**
 * A ticket's metadata with every id quoted: `id`, `parent`, and each entry of
 * `blocked_by`. Quoting only `id` is not enough — a reference to an id is an id,
 * and `parent: 66428e` reads back as the number 66428, silently detaching the
 * ticket.
 */
function withQuotedIds(metadata: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => {
      if ((ID_FIELDS as readonly string[]).includes(key) && typeof value === "string") {
        return [key, quoted(value)];
      }
      if (key === "blocked_by" && Array.isArray(value)) {
        return [key, value.map((id) => (typeof id === "string" ? quoted(id) : id))];
      }
      return [key, value];
    }),
  );
}

export function writeTicket(ticket: Ticket): void {
  const body = ticket.body === "" || ticket.body.endsWith("\n") ? ticket.body : `${ticket.body}\n`;
  const metadata = withQuotedIds(metadataOf(ticket));
  writeFileSync(ticket.path, `---\n${stringifyYaml(metadata)}---\n\n${body}`);
}

/** A readable filename fragment, derived from the title. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/, "");
}

export function filenameFor(id: string, title: string): string {
  const slug = slugify(title);
  return slug === "" ? `${id}.md` : `${slug}-${id}.md`;
}

/**
 * Writes a ticket, moving its file when the title no longer matches the slug.
 * The filename is derived from the title; frontmatter is the source of truth.
 */
export function saveTicket(ticket: Ticket): Ticket {
  const directory = dirname(ticket.path);
  const wanted = join(directory, filenameFor(ticket.id, ticket.title));
  if (wanted !== ticket.path) {
    renameSync(ticket.path, wanted);
  }
  const moved = { ...ticket, path: wanted };
  writeTicket(moved);
  return moved;
}

/**
 * Removes every blocker and parent link naming a deleted ticket, saving each
 * ticket it changes, and returns what it removed so the caller can say so.
 * Only for a deletion: a link to a ticket that is merely absent may name one on
 * another branch, and is left for `moth check` to report instead.
 */
export function detachReferencesTo(tickets: Ticket[], deleted: string, now: Date): string[] {
  const detached: string[] = [];
  for (const ticket of tickets) {
    const blocked = (ticket.blocked_by ?? []).includes(deleted);
    const orphaned = ticket.parent === deleted;
    if (!blocked && !orphaned) continue;
    const kept = (ticket.blocked_by ?? []).filter((id) => id !== deleted);
    saveTicket({
      ...ticket,
      blocked_by: kept.length === 0 ? undefined : kept,
      parent: orphaned ? undefined : ticket.parent,
      updated_at: now.toISOString(),
    });
    if (blocked) detached.push(`${ticket.id} is no longer blocked by ${deleted}`);
    if (orphaned) detached.push(`${ticket.id} no longer has parent ${deleted}`);
  }
  return detached;
}

export type ParentProblem = { reason: string } | null;

/**
 * A ticket's ancestors, nearest first. Stops at a parent that is missing or
 * already seen, so a cycle in hand-edited files cannot loop forever.
 */
export function ancestorsOf(tickets: Ticket[], ticket: Ticket): Ticket[] {
  const chain: Ticket[] = [];
  const seen = new Set([ticket.id]);
  let current = ticket;
  while (current.parent !== undefined) {
    const parent = tickets.find((candidate) => candidate.id === current.parent);
    if (parent === undefined || seen.has(parent.id)) break;
    chain.push(parent);
    seen.add(parent.id);
    current = parent;
  }
  return chain;
}

/**
 * The parent cycle this ticket sits on, as ids from the ticket back round to
 * itself, or null when following its parents ends without returning to it.
 */
export function parentCycle(tickets: Ticket[], ticket: Ticket): string[] | null {
  const path = [ticket.id];
  let current = ticket;
  while (current.parent !== undefined) {
    const id = current.parent;
    if (id === ticket.id) return [...path, id];
    if (path.includes(id)) return null;
    const parent = tickets.find((candidate) => candidate.id === id);
    if (parent === undefined) return null;
    path.push(id);
    current = parent;
  }
  return null;
}

/**
 * Why a ticket may not take this parent, or null when it may. Nesting has no
 * depth limit (ADR-0005), so the one rule is that the hierarchy stays a tree: a
 * ticket cannot sit under itself, directly or through its descendants.
 */
export function parentProblem(tickets: Ticket[], child: Ticket, parentId: string): ParentProblem {
  if (parentId === child.id) {
    return { reason: "a ticket cannot be its own parent" };
  }
  const parent = tickets.find((ticket) => ticket.id === parentId);
  if (parent === undefined) {
    return { reason: `no ticket ${parentId} to be the parent` };
  }
  const above = ancestorsOf(tickets, parent).map((ticket) => ticket.id);
  const at = above.indexOf(child.id);
  if (at !== -1) {
    const loop = [child.id, parent.id, ...above.slice(0, at + 1)].join(" -> ");
    return { reason: `that would form a cycle: ${loop}` };
  }
  return null;
}

/** Categories in which a ticket is finished with, so it no longer blocks anything. */
const TERMINAL = ["completed", "canceled", "duplicate"];

export interface BlockingView {
  /** Blockers still open, so this ticket cannot start. */
  open: string[];
  /** Blockers naming a ticket that is not in the store. */
  dangling: string[];
}

/**
 * Only `blocked_by` is stored. What a ticket blocks is derived here, so the two
 * directions cannot drift and a link costs one file write rather than two.
 */
export function blockingView(
  tickets: Ticket[],
  ticket: Ticket,
  categoryOf: (status: string) => string | undefined,
): BlockingView {
  const open: string[] = [];
  const dangling: string[] = [];
  for (const id of ticket.blocked_by ?? []) {
    const blocker = tickets.find((candidate) => candidate.id === id);
    if (blocker === undefined) {
      dangling.push(id);
      continue;
    }
    const category = categoryOf(blocker.status);
    if (category === undefined || !TERMINAL.includes(category)) open.push(id);
  }
  return { open, dangling };
}

/** The tickets this one blocks, derived rather than stored. */
export function blocks(tickets: Ticket[], ticket: Ticket): string[] {
  return tickets
    .filter((candidate) => (candidate.blocked_by ?? []).includes(ticket.id))
    .map((candidate) => candidate.id)
    .sort();
}

export interface TicketProblem {
  id: string;
  reason: string;
}

/**
 * What is wrong with the tickets on disk. Reported rather than thrown: a repo
 * with one odd ticket should still list the other nineteen.
 */
export function validate(
  tickets: Ticket[],
  legalFields: string[],
  knownStatuses: string[],
): TicketProblem[] {
  const problems: TicketProblem[] = [];
  for (const ticket of tickets) {
    for (const field of REQUIRED_FIELDS) {
      if (ticket[field] === undefined) {
        problems.push({ id: ticket.id ?? basename(ticket.path), reason: `missing '${field}'` });
      }
    }
    for (const field of Object.keys(metadataOf(ticket))) {
      if (!legalFields.includes(field)) {
        problems.push({ id: ticket.id, reason: `undeclared field '${field}'` });
      }
    }
    if (!knownStatuses.includes(ticket.status)) {
      problems.push({ id: ticket.id, reason: `status '${ticket.status}' is not in config` });
    }
    // A dangling blocker was already reported and a dangling parent was not, so
    // a broken parent link read as a healthy store.
    if (ticket.parent !== undefined && !tickets.some((other) => other.id === ticket.parent)) {
      problems.push({ id: ticket.id, reason: `parent ${ticket.parent} does not exist` });
    }
  }
  return problems;
}
