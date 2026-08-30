import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { run } from "../src/run.ts";
import { captureIo } from "./io.ts";

/**
 * Creates a ticket through the real command, then patches its status.
 * `moth move` does not exist yet, so this is how tests reach other statuses.
 */
export async function givenTicket(
  dir: string,
  options: { title: string; status?: string },
): Promise<void> {
  await run(["new", options.title], captureIo(dir));
  if (options.status === undefined) return;

  const ticketsDir = join(dir, ".moth", "tickets");
  const file = readdirSync(ticketsDir).sort().at(-1);
  if (file === undefined) throw new Error("no ticket was written");

  const path = join(ticketsDir, file);
  const patched = readFileSync(path, "utf8").replace(/^status: .*$/m, `status: ${options.status}`);
  writeFileSync(path, patched);
}
