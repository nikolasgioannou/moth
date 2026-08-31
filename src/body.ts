import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Io } from "./io.ts";

/** The flags a body can arrive through, as the argument parser leaves them. */
interface BodyFlags {
  body?: unknown;
  "body-file"?: unknown;
}

export type BodyResult = { ok: true; body: string | undefined } | { ok: false; message: string };

/**
 * The body a caller supplied, or undefined when they supplied neither flag —
 * which `new` reads as empty and `edit` reads as unchanged.
 *
 * Trailing newlines are stripped so the stored file ends with exactly one
 * however the text arrived: typed as an argument, piped in, or read from a
 * file. moth reads no further into it than that; the body has no schema, so
 * nothing here inspects or reshapes what the caller wrote.
 */
export async function suppliedBody(values: BodyFlags, io: Io): Promise<BodyResult> {
  const file = values["body-file"];
  if (file === "-") return { ok: true, body: (await io.stdin()).replace(/\n+$/, "") };
  if (typeof file === "string") {
    try {
      // resolve, not join: join("/repo", "/tmp/b.md") yields "/repo/tmp/b.md",
      // so an absolute path would silently look in the wrong place.
      const path = resolve(io.cwd, file);
      return { ok: true, body: readFileSync(path, "utf8").replace(/\n+$/, "") };
    } catch {
      return { ok: false, message: `cannot read '${file}'` };
    }
  }
  return { ok: true, body: typeof values.body === "string" ? values.body : undefined };
}
