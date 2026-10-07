// The page behind `moth open`. Read-only: it fetches what the CLI prints with
// --json and lays it out. Every value from a ticket reaches the DOM as text
// through h(), never as markup; the exceptions are a body, which the server
// renders with raw HTML disabled, and the icons, which are constants below.

/** Builds an element. Strings among the children become text nodes. */
function h(tag, attributes = {}, ...children) {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined || value === null || value === false) continue;
    if (name.startsWith("on")) element.addEventListener(name.slice(2), value);
    else element.setAttribute(name, value === true ? "" : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child === undefined || child === null || child === false) continue;
    element.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return element;
}

/** A GET against the server, as parsed JSON. A failure carries moth's own sentence. */
async function api(path) {
  const response = await fetch(path, { headers: { accept: "application/json" } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `request failed: ${response.status}`);
  return body;
}

/*
 * Icons from Lucide (https://lucide.dev), drawn on a 24px grid in currentColor.
 *
 * ISC License. Copyright (c) 2026 Lucide Icons and Contributors. Permission to
 * use, copy, modify, and/or distribute this software for any purpose with or
 * without fee is hereby granted, provided that the above copyright notice and
 * this permission notice appear in all copies. THE SOFTWARE IS PROVIDED "AS IS"
 * AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE.
 */
const ICONS = {
  kanban:
    '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 7v7"/><path d="M12 7v4"/><path d="M16 7v9"/>',
  list: '<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  search: '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
  alert:
    '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  tree: '<rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>',
};

function icon(name, className = "") {
  const element = h("span", { class: `icon ${className}`.trim(), "aria-hidden": "true" });
  element.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
  return element;
}

/** Categories in which a ticket is finished with, as moth defines them. */
const TERMINAL = ["completed", "canceled", "duplicate"];

/** The tone a status is drawn in, by its category: Notion's grey, blue and green. */
const TONES = {
  backlog: "neutral",
  unstarted: "neutral",
  started: "pending",
  completed: "ok",
  canceled: "neutral",
  duplicate: "neutral",
};

function toneOf(category) {
  return TONES[category] ?? "error";
}

/** A tinted label with a dot, for a state: a status, blocked, live. */
function pill(tone, text, attributes = {}) {
  return h(
    "span",
    { ...attributes, class: `pill tone-${tone} ${attributes.class ?? ""}`.trim() },
    h("span", { class: "pill-dot" }),
    text,
  );
}

/** A small neutral label, for a value: a priority, a label, a count. */
function badge(text, className = "") {
  return h("span", { class: `badge ${className}`.trim() }, text);
}

function statusPill(store, status) {
  return pill(toneOf(store.categoryOf(status)), status, {
    title: store.categoryOf(status) ?? "not in config",
  });
}

function priorityBadge(priority) {
  if (priority === "none") return null;
  return badge(priority, `priority-${priority}`);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function shortDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const thisYear = date.getFullYear() === new Date().getFullYear();
  return `${MONTHS[date.getMonth()]} ${date.getDate()}${thisYear ? "" : `, ${date.getFullYear()}`}`;
}

function ticketHref(ticket) {
  return `/tickets/${ticket.id}`;
}

/**
 * Everything a view needs about the whole store, fetched together. Which
 * tickets are blocked comes from `moth list --blocked`, not from logic of the
 * page's own, so a card can never disagree with the CLI about it.
 */
async function loadStore() {
  const [schema, tickets, blocked] = await Promise.all([
    api("/api/schema"),
    api("/api/tickets"),
    api("/api/tickets?blocked"),
  ]);
  const byId = new Map(tickets.map((ticket) => [ticket.id, ticket]));
  const categoryOf = (status) => schema.statuses.find((entry) => entry.name === status)?.category;
  const finished = (ticket) => TERMINAL.includes(categoryOf(ticket.status));
  return {
    schema,
    tickets,
    byId,
    categoryOf,
    finished,
    blocked: new Set(blocked.map((ticket) => ticket.id)),
    /** Blockers still open; a blocker naming no ticket is a check problem, not a block. */
    openBlockers: (ticket) =>
      (ticket.blocked_by ?? [])
        .map((id) => byId.get(id))
        .filter((blocker) => blocker !== undefined && !finished(blocker)),
    childrenOf: (ticket) => tickets.filter((candidate) => candidate.parent === ticket.id),
  };
}

/** Statuses in config order, then any a ticket uses that config no longer declares. */
function statusOrder(store, tickets = store.tickets) {
  const declared = store.schema.statuses.map((entry) => entry.name);
  const extra = [...new Set(tickets.map((ticket) => ticket.status))].filter(
    (status) => !declared.includes(status),
  );
  return [...declared, ...extra];
}

function blockedPill(store, ticket) {
  if (!store.blocked.has(ticket.id)) return null;
  const names = store
    .openBlockers(ticket)
    .map((blocker) => `${blocker.id} ${blocker.title}`)
    .join("\n");
  return pill("error", "Blocked", { title: `Blocked by:\n${names}`, class: "has-help" });
}

function progress(store, ticket) {
  const children = store.childrenOf(ticket);
  if (children.length === 0) return null;
  const done = children.filter(store.finished).length;
  return h(
    "span",
    { class: "badge progress", title: `${done} of ${children.length} sub-tickets finished` },
    icon("tree"),
    `${done}/${children.length}`,
  );
}

/** A page's title row, with anything that belongs beside it. */
function pageHeader(title, ...aside) {
  const beside = aside.filter(Boolean);
  return h(
    "header",
    { class: "page-header" },
    h("h1", {}, title),
    beside.length > 0 ? h("div", { class: "page-aside" }, beside) : null,
  );
}

function emptyState(title, description) {
  return h(
    "div",
    { class: "empty" },
    h("span", { class: "empty-title" }, title),
    description ? h("span", { class: "empty-text" }, description) : null,
  );
}

function card(store, ticket) {
  return h(
    "a",
    { class: "card", href: ticketHref(ticket) },
    h("span", { class: "card-title" }, ticket.title),
    h(
      "span",
      { class: "card-meta" },
      h("span", { class: "ticket-id" }, ticket.id),
      priorityBadge(ticket.priority),
      blockedPill(store, ticket),
      progress(store, ticket),
      ticket.labels.map((label) => badge(label)),
    ),
  );
}

/**
 * Finished columns the reader has opened. Held for the life of the page, so a
 * live update redraws them as they were left rather than collapsing them.
 */
const expanded = new Set();

function column(store, status) {
  const category = store.categoryOf(status);
  const tickets = store.tickets.filter((ticket) => ticket.status === status);
  const collapsible = TERMINAL.includes(category);
  const open = !collapsible || expanded.has(status);
  const toggle = () => {
    if (expanded.has(status)) expanded.delete(status);
    else expanded.add(status);
    render();
  };
  return h(
    "section",
    {
      class: `column tone-${toneOf(category)}${open ? "" : " is-collapsed"}`,
      "data-status": status,
    },
    h(
      "header",
      { class: "column-head" },
      statusPill(store, status),
      h("span", { class: "count" }, tickets.length),
      collapsible
        ? h(
            "button",
            {
              class: "icon-button column-toggle",
              type: "button",
              onclick: toggle,
              "aria-expanded": open,
              "aria-label": open ? `Hide ${status}` : `Show ${status}`,
            },
            icon("chevronRight"),
          )
        : null,
    ),
    open
      ? h(
          "div",
          { class: "column-cards" },
          tickets.map((ticket) => card(store, ticket)),
        )
      : null,
  );
}

/** The tabs over the columns, by the categories each shows. */
const TABS = [
  { key: "all", text: "All", categories: null },
  { key: "active", text: "Active", categories: ["unstarted", "started"] },
  { key: "backlog", text: "Backlog", categories: ["backlog"] },
];

async function columnsView() {
  const params = new URLSearchParams(location.search);
  const tab = TABS.find((entry) => entry.key === params.get("show")) ?? TABS[0];
  const store = await loadStore();
  const statuses = statusOrder(store).filter(
    (status) => tab.categories === null || tab.categories.includes(store.categoryOf(status)),
  );
  return h(
    "div",
    { class: "page page-wide" },
    pageHeader(
      "Tickets",
      h(
        "nav",
        { class: "segmented", "aria-label": "Show" },
        TABS.map((entry) =>
          h(
            "a",
            {
              href: entry.key === "all" ? "/" : `/?show=${entry.key}`,
              "aria-current": entry.key === tab.key ? "page" : null,
            },
            entry.text,
          ),
        ),
      ),
    ),
    store.tickets.length === 0
      ? emptyState("No tickets yet", 'Create one with moth new "a title".')
      : h(
          "div",
          { class: "columns" },
          statuses.map((status) => column(store, status)),
        ),
  );
}

/** A ticket as a row of a card: id, title, then what else it carries. */
function row(store, ticket, options = {}) {
  const parent = ticket.parent === undefined ? undefined : store.byId.get(ticket.parent);
  return h(
    "a",
    { class: "row", href: ticketHref(ticket) },
    h("span", { class: "ticket-id" }, ticket.id),
    h("span", { class: "row-title" }, ticket.title),
    h(
      "span",
      { class: "row-end" },
      options.status === true ? statusPill(store, ticket.status) : null,
      blockedPill(store, ticket),
      progress(store, ticket),
      priorityBadge(ticket.priority),
      ticket.labels.map((label) => badge(label)),
      options.parent === false || ticket.parent === undefined
        ? null
        : h(
            "span",
            { class: "row-parent", title: parent?.title ?? ticket.parent },
            parent?.title ?? ticket.parent,
          ),
      h("span", { class: "row-date" }, shortDate(ticket.created_at)),
    ),
  );
}

/** Sub-tickets to any depth, each level indented. `seen` stops a hand-made cycle. */
function subRows(store, ticket, depth = 0, seen = new Set([ticket.id])) {
  return store
    .childrenOf(ticket)
    .filter((child) => !seen.has(child.id))
    .flatMap((child) => {
      seen.add(child.id);
      const line = row(store, child, { parent: false, status: true });
      line.classList.add(`depth-${Math.min(depth, 4)}`);
      return [line, ...subRows(store, child, depth + 1, seen)];
    });
}

/** Outermost ancestor first. A parent that is missing still shows, as its id. */
function ancestry(store, ticket) {
  const chain = [];
  const seen = new Set([ticket.id]);
  let parent = ticket.parent;
  while (parent !== undefined && !seen.has(parent)) {
    seen.add(parent);
    chain.unshift(parent);
    parent = store.byId.get(parent)?.parent;
  }
  return chain;
}

/** A command the reader can copy, since the page itself changes nothing. */
function command(text) {
  const code = h("code", {}, text);
  const button = h(
    "button",
    { type: "button", class: "icon-button", "aria-label": "Copy" },
    icon("copy"),
  );
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(code.textContent);
      button.replaceChildren(icon("check"));
    } catch {
      button.title = "Select the command to copy it";
    }
    setTimeout(() => button.replaceChildren(icon("copy")), 1500);
  });
  return h("div", { class: "command" }, code, button);
}

function moveCommand(store, ticket) {
  const others = store.schema.statuses.filter((entry) => entry.name !== ticket.status);
  if (others.length === 0) return null;
  const line = command(`moth move ${ticket.id} ${others[0].name}`);
  const select = h(
    "select",
    { class: "select", "aria-label": "Status to move to" },
    others.map((entry) => h("option", { value: entry.name }, entry.name)),
  );
  select.addEventListener("change", () => {
    line.querySelector("code").textContent = `moth move ${ticket.id} ${select.value}`;
  });
  return h("div", { class: "move" }, line, select);
}

/** Fields the properties already show, so the rest are listed after them. */
const SHOWN_ELSEWHERE = [
  "id",
  "title",
  "status",
  "priority",
  "labels",
  "parent",
  "blocked_by",
  "body",
  "path",
];

/** Names for the timestamps; any other field shows as its own name. */
const FIELD_NAMES = { created_at: "Created", updated_at: "Updated" };

function property(name, ...value) {
  return h(
    "div",
    { class: "property" },
    h("span", { class: "property-name" }, name),
    h("span", { class: "property-value" }, value),
  );
}

function linkedTicket(store, id) {
  const ticket = store.byId.get(id);
  if (ticket === undefined) return h("span", { class: "missing" }, `${id}, not in this store`);
  return h(
    "a",
    { class: "linked", href: ticketHref(ticket), title: ticket.status },
    h("span", { class: `pill-dot tone-${toneOf(store.categoryOf(ticket.status))}` }),
    ticket.title,
  );
}

const none = () => h("span", { class: "subtle" }, "None");

async function ticketView(current) {
  const [store, shown] = await Promise.all([
    loadStore(),
    api(`/api/tickets/${encodeURIComponent(current.id)}`),
  ]);
  const ticket = store.byId.get(shown.id) ?? shown;
  const response = await fetch(`/api/tickets/${encodeURIComponent(shown.id)}/body`);
  const body = h("div", { class: "body" });
  // The one place markup from a ticket is trusted: the server renders it with
  // raw HTML disabled, and the content security policy forbids script within it.
  body.innerHTML = await response.text();

  const blockedBy = shown.blocked_by ?? [];
  const blocking = store.tickets.filter((other) => (other.blocked_by ?? []).includes(shown.id));
  const chain = ancestry(store, shown);
  const parent = shown.parent === undefined ? undefined : store.byId.get(shown.parent);
  const children = subRows(store, ticket);
  const extra = Object.entries(shown).filter(([name]) => !SHOWN_ELSEWHERE.includes(name));

  document.title = `${shown.title} · moth`;
  return h(
    "article",
    { class: "page" },
    h(
      "div",
      { class: "page-top" },
      h(
        "a",
        { class: "button ghost back", href: parent === undefined ? "/" : ticketHref(parent) },
        icon("chevronLeft"),
        h("span", {}, parent === undefined ? "Tickets" : parent.title),
      ),
      chain.length > 1
        ? h(
            "nav",
            { class: "trail", "aria-label": "Parents" },
            chain.slice(0, -1).map((id) => {
              const ancestor = store.byId.get(id);
              return [
                ancestor === undefined
                  ? id
                  : h("a", { href: ticketHref(ancestor) }, ancestor.title),
                icon("chevronRight"),
              ];
            }),
          )
        : null,
    ),
    pageHeader(shown.title),
    h(
      "section",
      { class: "properties" },
      property("Status", statusPill(store, shown.status), blockedPill(store, shown)),
      property(
        "Priority",
        shown.priority === "none" ? none() : badge(shown.priority, `priority-${shown.priority}`),
      ),
      property(
        "Labels",
        shown.labels.length === 0 ? none() : shown.labels.map((label) => badge(label)),
      ),
      shown.parent === undefined ? null : property("Parent", linkedTicket(store, shown.parent)),
      property(
        "Blocked by",
        blockedBy.length === 0 ? none() : blockedBy.map((id) => linkedTicket(store, id)),
      ),
      property(
        "Blocks",
        blocking.length === 0 ? none() : blocking.map((other) => linkedTicket(store, other.id)),
      ),
      extra.map(([name, value]) => {
        const text = Array.isArray(value) ? value.join(", ") : String(value);
        const isDate = name === "created_at" || name === "updated_at";
        return property(
          FIELD_NAMES[name] ?? name,
          isDate ? h("span", { title: text }, shortDate(text)) : text,
        );
      }),
      property("File", h("code", { class: "path" }, shown.path)),
    ),
    shown.body.trim() === "" ? h("p", { class: "subtle" }, "No description.") : body,
    children.length === 0
      ? null
      : h(
          "section",
          { class: "section" },
          h("h2", {}, "Sub-tickets", progress(store, ticket)),
          h("div", { class: "card-list" }, children),
        ),
    h(
      "section",
      { class: "section" },
      h("h2", {}, "Commands"),
      h(
        "div",
        { class: "panel commands" },
        moveCommand(store, shown),
        command(`moth show ${shown.id}`),
        command(`moth edit ${shown.id} --body-file -`),
      ),
    ),
  );
}

/**
 * A filter as a menu under a plain button. Each checked option is its own query
 * parameter, as a repeated flag would be, so `?status=todo&status=done` is
 * `moth list --status todo --status done`.
 */
function filterMenu(text, name, options, chosen, kind = "checkbox") {
  const count = chosen.filter((value) => value !== "").length;
  return h(
    "details",
    { class: count > 0 ? "filter is-set" : "filter", "data-menu": text },
    h(
      "summary",
      { class: "button" },
      text,
      count > 0 ? h("span", { class: "filter-count" }, count) : null,
    ),
    h(
      "div",
      { class: "menu" },
      options.length === 0 ? h("span", { class: "subtle menu-empty" }, "None yet") : null,
      options.map(([value, label, decoration]) =>
        h(
          "label",
          {},
          h("input", { type: kind, name, value, checked: chosen.includes(value) }),
          decoration ?? null,
          h("span", {}, label),
        ),
      ),
    ),
  );
}

function formQuery(form) {
  const params = new URLSearchParams();
  for (const [name, value] of new FormData(form)) {
    if (name === "blocking") {
      if (value !== "") params.append(value, "");
      continue;
    }
    if (typeof value === "string" && value.trim() !== "") params.append(name, value.trim());
  }
  return params.toString().replace(/=(?=&|$)/g, "");
}

function grouped(store, tickets) {
  if (tickets.length === 0) return [emptyState("No tickets match those filters")];
  return statusOrder(store, tickets)
    .map((status) => {
      const group = tickets.filter((ticket) => ticket.status === status);
      if (group.length === 0) return null;
      return h(
        "section",
        { class: "group" },
        h(
          "header",
          { class: "group-head" },
          statusPill(store, status),
          h("span", { class: "count" }, group.length),
        ),
        h(
          "div",
          { class: "card-list" },
          group.map((ticket) => row(store, ticket)),
        ),
      );
    })
    .filter(Boolean);
}

/** Menus left open across a redraw, so a live update does not snap one shut. */
const openMenus = new Set();

async function listView() {
  const params = new URLSearchParams(location.search);
  const store = await loadStore();
  const query = location.search.slice(1);
  let tickets = [];
  let failure = null;
  try {
    tickets = await api(`/api/tickets${query === "" ? "" : `?${query}`}`);
  } catch (error) {
    failure = error.message;
  }

  const labels = [...new Set(store.tickets.flatMap((ticket) => ticket.labels))].sort();
  const parents = store.tickets.filter((ticket) => store.childrenOf(ticket).length > 0);
  const blocking = params.has("blocked") ? "blocked" : params.has("unblocked") ? "unblocked" : "";
  const dot = (category) => h("span", { class: `pill-dot tone-${toneOf(category)}` });

  const form = h(
    "form",
    { class: "filters", role: "search" },
    h(
      "label",
      { class: "field" },
      icon("search"),
      h("input", {
        id: "filter-search",
        type: "search",
        name: "search",
        value: params.get("search") ?? "",
        placeholder: "Search",
        "aria-label": "Search titles and bodies",
      }),
    ),
    filterMenu(
      "Status",
      "status",
      store.schema.statuses.map((entry) => [entry.name, entry.name, dot(entry.category)]),
      params.getAll("status"),
    ),
    filterMenu(
      "Category",
      "category",
      store.schema.categories.map((category) => [category, category, dot(category)]),
      params.getAll("category"),
    ),
    filterMenu(
      "Priority",
      "priority",
      [...store.schema.priorities].reverse().map((priority) => [priority, priority]),
      params.getAll("priority"),
    ),
    filterMenu(
      "Labels",
      "label",
      labels.map((label) => [label, label]),
      params.getAll("label"),
    ),
    filterMenu(
      "Parent",
      "parent",
      [
        ["", "Any"],
        ["none", "None (top level)"],
        ...parents.map((parent) => [parent.id, parent.title]),
      ],
      [params.get("parent") ?? ""],
      "radio",
    ),
    filterMenu(
      "Blocked",
      "blocking",
      [
        ["", "Any"],
        ["blocked", "Blocked"],
        ["unblocked", "Unblocked"],
      ],
      [blocking],
      "radio",
    ),
    params.size > 0 ? h("a", { class: "button ghost", href: "/list" }, "Clear") : null,
  );
  for (const menu of form.querySelectorAll("details")) {
    const name = menu.dataset.menu;
    if (openMenus.has(name)) menu.open = true;
    menu.addEventListener("toggle", () => {
      if (menu.open) openMenus.add(name);
      else openMenus.delete(name);
    });
  }

  let typing;
  const update = () => {
    const next = formQuery(form);
    history.replaceState(null, "", next === "" ? "/list" : `/list?${next}`);
    render();
  };
  form.addEventListener("change", update);
  form.addEventListener("submit", (event) => event.preventDefault());
  form.addEventListener("input", (event) => {
    if (event.target.name !== "search") return;
    clearTimeout(typing);
    typing = setTimeout(update, 200);
  });

  return h(
    "div",
    { class: "page page-list" },
    pageHeader(
      "List",
      failure === null
        ? h("span", { class: "subtle" }, `${tickets.length} of ${store.tickets.length}`)
        : null,
    ),
    form,
    failure === null
      ? h("div", { class: "groups" }, grouped(store, tickets))
      : h("p", { class: "error" }, failure),
  );
}

/** The views, by route name. Each returns the page to show. */
const VIEWS = {
  columns: columnsView,
  ticket: ticketView,
  list: listView,
};

/** The routes this page draws; the server answers each with the same document. */
const PAGES = [/^\/$/, /^\/list$/, /^\/tickets\/[^/]+$/];

function route(pathname) {
  if (pathname === "/list") return { name: "list" };
  const ticket = /^\/tickets\/([^/]+)$/.exec(pathname);
  if (ticket !== null) return { name: "ticket", id: decodeURIComponent(ticket[1]) };
  return { name: "columns" };
}

/** Top-level tickets with sub-tickets, in the sidebar, each opening its sub-tickets. */
async function renderParents() {
  let store;
  try {
    store = await loadStore();
  } catch {
    return;
  }
  const parents = store.tickets.filter(
    (ticket) => ticket.parent === undefined && store.childrenOf(ticket).length > 0,
  );
  const here = `${location.pathname}${location.search}`;
  document.getElementById("parents").replaceChildren(
    ...(parents.length === 0
      ? [h("span", { class: "side-empty" }, "None yet")]
      : parents.map((parent) => {
          const href = `/list?parent=${parent.id}`;
          return h(
            "a",
            {
              class: "side-item",
              href,
              "aria-current": here === href ? "page" : null,
              title: parent.title,
            },
            h(
              "span",
              { class: "side-icon" },
              h("span", { class: `pill-dot tone-${toneOf(store.categoryOf(parent.status))}` }),
            ),
            h("span", {}, parent.title),
          );
        })),
  );
}

/**
 * What `moth check` would report, above every view. Each finding is check's own
 * sentence, which names the command that repairs it.
 */
async function renderProblems() {
  const banner = document.getElementById("problems");
  let problems;
  try {
    ({ problems } = await api("/api/check"));
  } catch {
    return;
  }
  if (problems.length === 0) {
    banner.replaceChildren();
    return;
  }
  const wasOpen = banner.querySelector("details")?.open ?? false;
  const count = `${problems.length} problem${problems.length === 1 ? "" : "s"}`;
  banner.replaceChildren(
    h(
      "details",
      { class: "callout", open: wasOpen },
      h("summary", {}, icon("alert"), `moth check found ${count} with the tickets on disk`),
      h(
        "ul",
        {},
        problems.map((problem) => h("li", {}, problem)),
      ),
    ),
  );
}

/** Counts redraws, so a slow one cannot land on top of a newer one. */
let drawn = 0;

async function render() {
  const generation = ++drawn;
  renderProblems();
  renderParents();
  const current = route(location.pathname);
  for (const link of document.querySelectorAll("[data-route]")) {
    const here = link.dataset.route === current.name;
    if (here) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  const view = VIEWS[current.name] ?? VIEWS.columns;
  const main = document.querySelector(".main");
  const target = document.getElementById("view");
  // A redraw replaces every element, so whatever had focus, such as the search
  // box mid-word, is found again by id and given its caret back.
  const focused = document.activeElement?.id || null;
  const caret = document.activeElement?.selectionStart ?? null;
  let page;
  try {
    page = await view(current);
  } catch (error) {
    page = h("div", { class: "page" }, h("p", { class: "error" }, error.message));
  }
  if (generation !== drawn) return;
  if (current.name !== "ticket") document.title = "moth";
  // Where the reader was, the page and each column, so a redraw does not move them.
  const scrollY = main.scrollTop;
  const scrollX = target.querySelector(".columns")?.scrollLeft ?? 0;
  const columnScroll = new Map(
    [...target.querySelectorAll(".column")].map((column) => [
      column.dataset.status,
      column.querySelector(".column-cards")?.scrollTop ?? 0,
    ]),
  );
  target.replaceChildren(page);
  const columns = target.querySelector(".columns");
  if (columns !== null) columns.scrollLeft = scrollX;
  for (const column of target.querySelectorAll(".column")) {
    const cards = column.querySelector(".column-cards");
    if (cards !== null) cards.scrollTop = columnScroll.get(column.dataset.status) ?? 0;
  }
  main.scrollTop = scrollY;
  const refocus = focused === null ? null : document.getElementById(focused);
  if (refocus !== null) {
    refocus.focus();
    if (caret !== null) refocus.setSelectionRange?.(caret, caret);
  }
}

/** Follows links within the page without reloading it. */
function navigate(href) {
  history.pushState(null, "", href);
  document.querySelector(".main").scrollTop = 0;
  render();
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");
  if (link === null || event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const url = new URL(link.href);
  // Only the page's own routes; a body's relative link to a repo file is left
  // to the server, which says it has no such page.
  if (url.origin !== location.origin || !PAGES.some((page) => page.test(url.pathname))) return;
  event.preventDefault();
  navigate(url.pathname + url.search);
});

// A filter menu closes when the reader clicks anywhere else, as menus do.
document.addEventListener("click", (event) => {
  for (const menu of document.querySelectorAll("details.filter[open]")) {
    if (!menu.contains(event.target)) menu.open = false;
  }
});

window.addEventListener("popstate", () => render());

for (const slot of document.querySelectorAll("[data-icon]")) {
  slot.append(icon(slot.dataset.icon));
}

/**
 * Redraws whenever the server says the store changed on disk, whoever changed
 * it. The browser reconnects by itself when the server goes away; the first
 * connection after that redraws too, to catch up on anything missed.
 */
function listen() {
  const show = (tone, text) =>
    document.getElementById("live").replaceWith(pill(tone, text, { id: "live" }));
  const events = new EventSource("/api/events");
  let lost = false;
  events.addEventListener("open", () => {
    show("ok", "Live");
    if (lost) render();
    lost = false;
  });
  events.addEventListener("change", () => render());
  events.addEventListener("error", () => {
    lost = true;
    show("attention", "Reconnecting");
  });
}

listen();

render();
