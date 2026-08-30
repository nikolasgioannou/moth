/** The six status categories, fixed for every repo. */
export const CATEGORIES = [
  { category: "backlog", defaultStatus: "backlog" },
  { category: "unstarted", defaultStatus: "todo" },
  { category: "started", defaultStatus: "in-progress" },
  { category: "completed", defaultStatus: "done" },
  { category: "canceled", defaultStatus: "canceled" },
  { category: "duplicate", defaultStatus: "duplicate" },
] as const;

/** The priority values, fixed for every repo. "none" is the default. */
export const PRIORITIES = ["none", "low", "medium", "high", "urgent"] as const;

/** Fields moth itself defines on every ticket. */
export const CORE_FIELDS = [
  "id",
  "title",
  "status",
  "priority",
  "labels",
  "parent",
  "blocked_by",
  "created_at",
  "updated_at",
] as const;

export interface Config {
  prefix: string;
  statuses: { name: string; category: string }[];
  /** Extra fields this repo permits on a ticket. Anything else is refused. */
  fields?: string[];
  /** Where tickets live, relative to the repo root. */
  tickets?: string;
}

/** Every field name a ticket may carry in this repo. */
export function legalFields(config: Config): string[] {
  return [...CORE_FIELDS, ...(config.fields ?? [])];
}

export function readConfigFile(contents: string): Config {
  return Bun.YAML.parse(contents) as Config;
}
