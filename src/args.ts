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
    const { values, positionals, tokens } = parseArgsNode({
      args,
      options,
      allowPositionals: true,
      strict: true,
      tokens: true,
    });
    // The parser keeps the last of a repeated single-value flag and drops the
    // rest without a word, so `--status todo --status done` would quietly mean
    // `--status done`. Refuse it instead of answering a different question.
    const seen = new Set<string>();
    for (const token of tokens) {
      if (token.kind !== "option") continue;
      const spec = options[token.name];
      if (spec?.type !== "string" || spec.multiple === true) continue;
      if (seen.has(token.name)) {
        return {
          ok: false,
          message: `--${token.name} takes one value but was given more than once`,
        };
      }
      seen.add(token.name);
    }
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

/** A filter's values, from repeated flags, comma-separated lists, or both. */
export function anyOf(value: string | boolean | (string | boolean)[] | undefined): string[] {
  return stringList(value)
    .flatMap((entry) => entry.split(","))
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");
}
