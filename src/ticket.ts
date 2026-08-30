import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface Ticket {
  id: number;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  body: string;
}

function parse(raw: string): Ticket {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  const frontmatter = match?.[1];
  const body = match?.[2];
  if (frontmatter === undefined || body === undefined) {
    throw new Error("ticket has no frontmatter");
  }
  const data = Bun.YAML.parse(frontmatter) as Omit<Ticket, "body">;
  return { ...data, body: body.replace(/^\n/, "") };
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

export function readTickets(ticketsDir: string): Ticket[] {
  return readdirSync(ticketsDir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => parse(readFileSync(join(ticketsDir, name), "utf8")));
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
