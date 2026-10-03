import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Io } from "./io.ts";

/** Parsed flag values, of which a body reads only its own two. */
type BodyFlags = Record<string, unknown>;

/** The pair of flags a body arrives through: as text, or from a file or stdin. */
export interface BodySource {
  text: string;
  file: string;
}

const REPLACE: BodySource = { text: "body", file: "body-file" };
export const APPEND: BodySource = { text: "append-body", file: "append-body-file" };

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
export async function suppliedBody(
  values: BodyFlags,
  io: Io,
  source: BodySource = REPLACE,
): Promise<BodyResult> {
  const file = values[source.file];
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
  const text = values[source.text];
  return { ok: true, body: typeof text === "string" ? text : undefined };
}
