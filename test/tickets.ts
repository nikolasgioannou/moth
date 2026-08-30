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
  options: { title: string; hex: string; status?: string },
): Promise<void> {
  await run(["new", options.title], captureIo(dir, { randomHex: () => options.hex }));
  if (options.status === undefined) return;

  const ticketsDir = join(dir, ".moth", "tickets");
  const file = readdirSync(ticketsDir).find((name) => name.includes(options.hex));
  if (file === undefined) throw new Error(`no ticket written for ${options.hex}`);

  const path = join(ticketsDir, file);
  const patched = readFileSync(path, "utf8").replace(/^status: .*$/m, `status: ${options.status}`);
  writeFileSync(path, patched);
}
