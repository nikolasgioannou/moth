import type { OptionSpec } from "./args.ts";
import { stringList } from "./args.ts";
import type { Config } from "./config.ts";
import { blockingView, type Ticket } from "./ticket.ts";

/** The filters every command that lists tickets accepts, declared once. */
export const FILTER_OPTIONS: OptionSpec = {
  status: { type: "string" },
  category: { type: "string" },
  priority: { type: "string" },
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
  const search = typeof values.search === "string" ? values.search.toLowerCase() : undefined;

  return all.filter((ticket) => {
    if (typeof values.status === "string" && ticket.status !== values.status) return false;
    if (typeof values.category === "string" && categoryOf(ticket.status) !== values.category) {
      return false;
    }
    if (typeof values.priority === "string" && ticket.priority !== values.priority) return false;
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
