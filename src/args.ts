import { parseArgs as parseArgsNode } from "node:util";

export type OptionSpec = Record<string, { type: "string" | "boolean"; multiple?: boolean }>;

export type Parsed =
  | {
      ok: true;
      values: Record<string, string | boolean | (string | boolean)[] | undefined>;
      positionals: string[];
    }
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

/** A repeated string flag's values, narrowed from what the parser returns. */
export function stringList(value: string | boolean | (string | boolean)[] | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}
