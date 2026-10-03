import type { OptionSpec } from "./args.ts";
import { anyOf, stringList } from "./args.ts";
import type { Config } from "./config.ts";
import { blockingView, type Ticket } from "./ticket.ts";

/** The filters every command that lists tickets accepts, declared once. */
export const FILTER_OPTIONS: OptionSpec = {
  status: { type: "string", multiple: true },
  category: { type: "string", multiple: true },
  priority: { type: "string", multiple: true },
  label: { type: "string", multiple: true },
  search: { type: "string" },
  blocked: { type: "boolean" },
  unblocked: { type: "boolean" },
};

export type FlagValues = Record<string, string | boolean | (string | boolean)[] | undefined>;

export function categoryLookup(config: Config): (status: string) => string | undefined {
  return (status) => config.statuses.find((entry) => entry.name === status)?.category;
}

/** Narrows a set of tickets by every filter the caller supplied. */
export function filterTickets(all: Ticket[], values: FlagValues, config: Config): Ticket[] {
  const categoryOf = categoryLookup(config);
  const wantedLabels = stringList(values.label);
  const statuses = anyOf(values.status);
  const categories = anyOf(values.category);
  const priorities = anyOf(values.priority);
  const search = typeof values.search === "string" ? values.search.toLowerCase() : undefined;

  return all.filter((ticket) => {
    // Within one filter, a ticket matches any of the values given.
    if (statuses.length > 0 && !statuses.includes(ticket.status)) return false;
    const category = categoryOf(ticket.status) ?? "";
    if (categories.length > 0 && !categories.includes(category)) return false;
    if (priorities.length > 0 && !priorities.includes(ticket.priority)) return false;
    if (!wantedLabels.every((label) => ticket.labels.includes(label))) return false;
    if (values.blocked === true || values.unblocked === true) {
      const isBlocked = blockingView(all, ticket, categoryOf).open.length > 0;
      if (values.blocked === true && !isBlocked) return false;
      if (values.unblocked === true && isBlocked) return false;
    }
    if (search !== undefined) {
      if (!`${ticket.title}\n${ticket.body}`.toLowerCase().includes(search)) return false;
    }
    return true;
  });
}

/** Statuses in config order, then any a ticket still uses that config no longer declares. */
export function statusOrder(config: Config, tickets: Ticket[]): string[] {
  const declared = config.statuses.map((entry) => entry.name);
  const extra = [...new Set(tickets.map((ticket) => ticket.status))].filter(
    (status) => !declared.includes(status),
  );
  return [...declared, ...extra];
}
