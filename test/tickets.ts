import { run } from "../src/run.ts";
import { captureIo } from "./capture-io.ts";

/** Creates a ticket, and moves it, entirely through the real commands. */
export async function givenTicket(
  dir: string,
  options: { title: string; status?: string },
): Promise<void> {
  const created = captureIo(dir);
  await run(["new", options.title], created);
  if (options.status === undefined) return;

  const reference = created.out().trim().split(/\s+/)[0] ?? "";
  await run(["move", reference, options.status], captureIo(dir));
}
