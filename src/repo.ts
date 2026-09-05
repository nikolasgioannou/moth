import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Config } from "./config.ts";

export const CONFIG_FILENAME = "moth.config.yml";
export const DEFAULT_TICKETS_DIR = ".moth";

export interface Repo {
  /** Directory holding the config file. */
  root: string;
  config: Config;
  ticketsDir: string;
}

export type OpenResult = { ok: true; repo: Repo } | { ok: false; message: string };

/** The nearest ancestor of `from` holding a config file, or null. */
export function findRoot(from: string): string | null {
  let directory = from;
  for (;;) {
    if (existsSync(join(directory, CONFIG_FILENAME))) return directory;
    const parent = dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
}

/**
 * Locates the repo a command is being run in. Commands share this so the
 * search, the config shape, and the "not a moth repo" message live in one place.
 */
export function openRepo(cwd: string): OpenResult {
  const root = findRoot(cwd);
  if (root === null) {
    return { ok: false, message: "not a moth repo, run 'moth init' first" };
  }

  const config = Bun.YAML.parse(readFileSync(join(root, CONFIG_FILENAME), "utf8")) as Config;
  const ticketsDir = join(root, config.tickets ?? DEFAULT_TICKETS_DIR);
  if (!existsSync(ticketsDir)) {
    return {
      ok: false,
      message: `config points tickets at '${config.tickets ?? DEFAULT_TICKETS_DIR}', which does not exist`,
    };
  }

  return { ok: true, repo: { root, config, ticketsDir } };
}
