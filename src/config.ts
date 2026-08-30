import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The six status categories, fixed for every repo. */
export const CATEGORIES = [
  { category: "backlog", defaultStatus: "backlog" },
  { category: "unstarted", defaultStatus: "todo" },
  { category: "started", defaultStatus: "in-progress" },
  { category: "completed", defaultStatus: "done" },
  { category: "canceled", defaultStatus: "canceled" },
  { category: "duplicate", defaultStatus: "duplicate" },
] as const;

export interface Config {
  prefix: string;
  statuses: { name: string; category: string }[];
}

export function readConfig(mothDir: string): Config {
  return Bun.YAML.parse(readFileSync(join(mothDir, "config.yml"), "utf8")) as Config;
}
