import { readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { stringify as stringifyYaml } from "yaml";

export interface Ticket {
  /** Where the ticket is stored. Local detail, never part of output. */
  path: string;
  id: number;
  title: string;
  status: string;
  priority: string;
  labels: string[];
  parent?: number;
  blocked_by?: number[];
  created_at: string;
  updated_at: string;
  body: string;
}

function parse(raw: string, path: string): Ticket {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  const frontmatter = match?.[1];
  const body = match?.[2];
  if (frontmatter === undefined || body === undefined) {
    throw new Error("ticket has no frontmatter");
  }
  const data = Bun.YAML.parse(frontmatter) as Omit<Ticket, "body" | "path">;
  return { ...data, labels: data.labels ?? [], path, body: body.replace(/^\n/, "") };
}

/** How an id is shown: padded, and prefixed only when the repo asked for one. */
export function formatId(id: number, prefix: string): string {
  const padded = padNumber(id);
  return prefix === "" ? padded : `${prefix}-${padded}`;
}

/** Ticket numbers are padded so a directory listing sorts correctly past ninety-nine. */
export function padNumber(id: number): string {
  return String(id).padStart(3, "0");
}

/** The next unused number, derived from the tickets already on disk. */
export function nextNumber(ticketsDir: string): number {
  const used = readdirSync(ticketsDir)
    .map((file) => /^(\d+)[-.]/.exec(file)?.[1])
    .filter((match): match is string => match !== undefined)
    .map(Number);
  return used.length === 0 ? 1 : Math.max(...used) + 1;
}

const PRIORITY_ORDER = ["urgent", "high", "medium", "low", "none"];

/** Most urgent first, then oldest first. Manual ordering is deliberately absent. */
function byPriorityThenAge(a: Ticket, b: Ticket): number {
  const rank = (ticket: Ticket) => {
    const index = PRIORITY_ORDER.indexOf(ticket.priority);
    return index === -1 ? PRIORITY_ORDER.length : index;
  };
  return rank(a) - rank(b) || a.id - b.id;
}

export function readTickets(ticketsDir: string): Ticket[] {
  return readdirSync(ticketsDir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const path = join(ticketsDir, name);
      return parse(readFileSync(path, "utf8"), path);
    })
    .sort(byPriorityThenAge);
}

/**
 * Numbers held by more than one ticket. Two branches can each allocate the
 * same number and git will merge both files cleanly, so this is how that
 * situation surfaces rather than passing unnoticed.
 */
export function duplicateNumbers(tickets: Ticket[]): number[] {
  const seen = new Set<number>();
  const duplicates = new Set<number>();
  for (const ticket of tickets) {
    if (seen.has(ticket.id)) duplicates.add(ticket.id);
    seen.add(ticket.id);
  }
  return [...duplicates].sort((a, b) => a - b);
}

export type Resolution =
  | { kind: "found"; ticket: Ticket }
  | { kind: "ambiguous"; tickets: Ticket[] }
  | { kind: "none" };

/**
 * Finds the ticket a reference names. A reference that reads as a number is
 * only ever matched against numbers, never against titles, so `20` cannot
 * resolve to a ticket merely titled "20 things to fix".
 */
export function resolve(tickets: Ticket[], reference: string, prefix: string): Resolution {
  const bare =
    prefix !== "" && reference.toLowerCase().startsWith(`${prefix.toLowerCase()}-`)
      ? reference.slice(prefix.length + 1)
      : reference;

  const matches = /^\d+$/.test(bare)
    ? tickets.filter((ticket) => ticket.id === Number(bare))
    : tickets.filter((ticket) => ticket.title.toLowerCase().includes(bare.toLowerCase()));

  if (matches.length === 1) return { kind: "found", ticket: matches[0] as Ticket };
  if (matches.length > 1) return { kind: "ambiguous", tickets: matches };
  return { kind: "none" };
}

/** A ticket's structured fields, without local storage detail or its body. */
export function metadataOf(ticket: Ticket): Omit<Ticket, "path" | "body"> {
  const { path: _path, body: _body, ...metadata } = ticket;
  return metadata;
}

export function writeTicket(ticket: Ticket): void {
  const body = ticket.body === "" || ticket.body.endsWith("\n") ? ticket.body : `${ticket.body}\n`;
  writeFileSync(ticket.path, `---\n${stringifyYaml(metadataOf(ticket))}---\n\n${body}`);
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

export function filenameFor(id: number, title: string): string {
  const slug = slugify(title);
  return slug === "" ? `${padNumber(id)}.md` : `${padNumber(id)}-${slug}.md`;
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

export type ParentProblem = { reason: string } | null;

/**
 * Why a ticket may not take this parent, or null when it may. Nesting is held
 * to one level, which also rules out cycles: a ticket that has a parent cannot
 * be one, and a ticket that is one cannot take a parent.
 */
export function parentProblem(tickets: Ticket[], child: Ticket, parentId: number): ParentProblem {
  if (parentId === child.id) {
    return { reason: "a ticket cannot be its own parent" };
  }
  const parent = tickets.find((ticket) => ticket.id === parentId);
  if (parent === undefined) {
    return { reason: `no ticket ${padNumber(parentId)} to be the parent` };
  }
  if (parent.parent !== undefined) {
    return { reason: "sub-tickets nest one level, and that ticket is already a sub-ticket" };
  }
  if (tickets.some((ticket) => ticket.parent === child.id)) {
    return { reason: "sub-tickets nest one level, and that ticket already has sub-tickets" };
  }
  return null;
}

/** Categories in which a ticket is finished with, so it no longer blocks anything. */
const TERMINAL = ["completed", "canceled", "duplicate"];

export interface BlockingView {
  /** Blockers still open, so this ticket cannot start. */
  open: number[];
  /** Blockers naming a ticket that is not in the store. */
  dangling: number[];
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
  const open: number[] = [];
  const dangling: number[] = [];
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
export function blocks(tickets: Ticket[], ticket: Ticket): number[] {
  return tickets
    .filter((candidate) => (candidate.blocked_by ?? []).includes(ticket.id))
    .map((candidate) => candidate.id)
    .sort((a, b) => a - b);
}
