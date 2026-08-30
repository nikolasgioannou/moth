import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface Ticket {
  id: string;
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

export function readTickets(ticketsDir: string): Ticket[] {
  return readdirSync(ticketsDir)
    .filter((name) => name.endsWith(".md"))
    .map((name) => parse(readFileSync(join(ticketsDir, name), "utf8")));
}
