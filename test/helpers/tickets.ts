import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { run } from "../../src/run.ts";
import { type CaptureOptions, captureIo } from "./capture-io.ts";

/** Creates a ticket and returns the id moth gave it, so tests never assume a scheme. */
export async function newTicket(
  dir: string,
  title: string,
  args: string[] = [],
  options: CaptureOptions = {},
): Promise<string> {
  const io = captureIo(dir, options);
  const code = await run(["new", title, ...args], io);
  if (code !== 0) throw new Error(`could not create '${title}': ${io.err()}`);
  return (io.out().trim().split(/\s+/)[0] ?? "").trim();
}

/** Creates a ticket and moves it, both through the real commands. */
export async function givenTicket(
  dir: string,
  options: { title: string; status?: string },
): Promise<string> {
  const id = await newTicket(dir, options.title);
  if (options.status !== undefined) {
    await run(["move", id, options.status], captureIo(dir));
  }
  return id;
}

/** The path of the file holding a ticket, found by id rather than assumed. */
export function ticketPath(dir: string, id: string): string {
  const tickets = join(dir, ".moth");
  const file = readdirSync(tickets).find(
    (name) => name.startsWith(`${id}-`) || name === `${id}.md`,
  );
  if (file === undefined) throw new Error(`no file for ticket ${id} in ${tickets}`);
  return join(tickets, file);
}

export function ticketText(dir: string, id: string): string {
  return readFileSync(ticketPath(dir, id), "utf8");
}
