import { parseArgs as parseArgsNode } from "node:util";

export type OptionSpec = Record<string, { type: "string" | "boolean" }>;

export type Parsed =
  | { ok: true; values: Record<string, string | boolean | undefined>; positionals: string[] }
  | { ok: false; message: string };

/**
 * Parses a command's arguments, accepting flags in any position. Errors are
 * returned rather than thrown so the caller decides how to report them.
 */
export function parseArgs(args: string[], options: OptionSpec): Parsed {
  try {
    const { values, positionals } = parseArgsNode({
      args,
      options,
      allowPositionals: true,
      strict: true,
    });
    return { ok: true, values, positionals };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}
